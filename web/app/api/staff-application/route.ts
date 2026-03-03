import { NextRequest, NextResponse } from "next/server"
import { randomUUID }                from "crypto"
import { has_user_applied, submit_application, delete_application, staff_application } from "../../../../src/shared/database/managers/staff_application_manager"
import { connect }                   from "../../../../src/shared/utils/database"

const __discord_api        = "https://discord.com/api/v10"
const __application_channel = "1391997695425515531"

/**
 * @description Sends a Component V2 formatted staff application embed to the designated Discord channel.
 * @param data - The submitted staff application data
 * @param uuid - The application UUID for the View data link
 * @returns Promise<void>
 */
async function send_discord_notification(data: staff_application, uuid: string): Promise<void> {
  const token    = process.env.DISCORD_BOT_TOKEN
  const base_url = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://azure48.xyz"
  if (!token) {
    console.error("[ - STAFF APP NOTIFY - ] DISCORD_BOT_TOKEN not set")
    return
  }

  const dob_display = data.dob
    ? new Date(data.dob).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : "N/A"

  const applied_unix = Math.floor((data.created_at ?? Date.now()) / 1000)

  const languages_display = Array.isArray(data.languages)
    ? data.languages.join(", ")
    : data.languages

  const view_url = `${base_url}/staff-form/application-data?id=${uuid}`

  const message_body = {
    flags     : 32768,
    components: [
      {
        type      : 17,
        components: [
          {
            type      : 9,
            components : [
              {
                type   : 10,
                content: "## Atomicals Staff Application"
              }
            ],
            accessory: {
              type : 2,
              style: 5,
              label: "View data",
              url  : view_url
            }
          }
        ]
      },
      {
        type      : 17,
        components: [
          { type: 10, content: `- Full Name\n> ${data.full_name}` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- Age ( DOB )\n> ${dob_display}` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- Discord\n> <@${data.discord_id}>` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- Language\n> ${languages_display}` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- How would you rate your communication skills? (1-10)\n> ${data.communication_skills}` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- Explanation\n> ${data.explanation}` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- How would you handle upset users?\n> ${data.handle_upset_users}` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- How would you handle uncertain situations?\n> ${data.handle_uncertainty}` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- Why do you want to be part of Atomic's staff team?\n> ${data.why_join}` },
          { type: 14, spacing: 2, divider: true },
          { type: 10, content: `- What makes you a good fit for the Support Representative role?\n> ${data.good_fit}` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- Do you have any other languages or past experience?\n> ${data.other_experience}` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- If you're unsure about how to handle a specific case, what would you do?\n> ${data.unsure_case}` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- Do you have a working microphone and are you willing to attend a voice interview if accepted?\n> ${data.working_mic}` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- Do you understand that abuse of staff power or inactivity can lead to removal from the team?\n> ${data.understand_abuse}` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- Do you have any additional questions or concerns for us?\n> ${data.additional_questions}` }
        ]
      },
      {
        type      : 17,
        components: [
          {
            type      : 9,
            components : [
              {
                type   : 10,
                content: `Applied at: <t:${applied_unix}:F>`
              }
            ],
            accessory: {
              style    : 2,
              type     : 2,
              label    : "Download Spreadsheet",
              flow     : { actions: [] },
              custom_id: `p_dl_${data.discord_id}`
            }
          }
        ]
      }
    ]
  }

  const res = await fetch(`${__discord_api}/channels/${__application_channel}/messages`, {
    method : "POST",
    headers: {
      "Authorization": `Bot ${token}`,
      "Content-Type" : "application/json"
    },
    body   : JSON.stringify(message_body)
  })

  if (!res.ok) {
    const err_text = await res.text()
    console.error(`[ - STAFF APP NOTIFY - ] Discord API error ${res.status}: ${err_text}`)
  }
}

// - SIMPLE RATE LIMITER IN MEMORY - \\
const __rate_limit_map = new Map<string, { count: number, reset_time: number }>()

const WINDOW_MS   = 60 * 1000 // 1 minute
const MAX_REQUEST = 3         // max 3 requests per minute

function check_rate_limit(ip: string): boolean {
  const now = Date.now()
  const record = __rate_limit_map.get(ip)

  if (!record || now > record.reset_time) {
    __rate_limit_map.set(ip, { count: 1, reset_time: now + WINDOW_MS })
    return true
  }

  if (record.count >= MAX_REQUEST) {
    return false
  }

  record.count++
  return true
}

/**
 * @route GET /api/staff-application
 * @description Check if the authenticated user has already applied
 */
export async function GET(req: NextRequest) {
  try {
    const discord_user_cookie = req.cookies.get("discord_user")
    if (!discord_user_cookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = JSON.parse(discord_user_cookie.value)
    if (!user || !user.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    await connect()
    const applied = await has_user_applied(user.id)
    return NextResponse.json({ applied })
  } catch (error) {
    console.error("[ - STAFF APP CHECK API - ] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/**
 * @route POST /api/staff-application
 * @description Submit a new staff application
 */
export async function POST(req: NextRequest) {
  try {
    // - CHECK REFERER / ORIGIN (ANTI-DDOS/EXTERNAL CALLS) - \\
    const referer = req.headers.get("referer") || ""
    const origin  = req.headers.get("origin") || ""
    const host    = req.headers.get("host") || ""
    
    const is_valid_origin = 
      (origin && origin.includes(host)) || 
      (referer && referer.includes(host))

    if (!is_valid_origin) {
      return NextResponse.json({ error: "Forbidden. Invalid request origin." }, { status: 403 })
    }

    // - CHECK RATE LIMIT - \\
    const ip = req.headers.get("x-forwarded-for") || "unknown"
    if (!check_rate_limit(ip)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }

    // - CHECK AUTH - \\
    const discord_user_cookie = req.cookies.get("discord_user")
    if (!discord_user_cookie) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 })
    }

    const user = JSON.parse(discord_user_cookie.value)
    if (!user || !user.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // - PARSE BODY - \\
    const body = await req.json()
    
    // - VALIDATE REQUIRED FIELDS - \\
    const required_fields = [
      "full_name", "dob", "languages", "communication_skills", 
      "explanation", "handle_upset_users", "handle_uncertainty", 
      "why_join", "good_fit", "other_experience", "unsure_case", 
      "working_mic", "understand_abuse", "additional_questions"
    ]

    for (const field of required_fields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // - CHECK IF ALREADY APPLIED (DISABLED FOR DEMO) - \\
    await connect()
    // if (await has_user_applied(user.id)) {
    //   return NextResponse.json({ error: "You have already submitted an application." }, { status: 403 })
    // }

    // - BUILD APPLICATION DATA - \\
    const application_uuid = randomUUID()

    const application_data: staff_application = {
      uuid                : application_uuid,
      discord_id          : user.id,
      discord_username    : user.username,
      full_name           : body.full_name,
      dob                 : new Date(body.dob).toISOString(),
      languages           : body.languages,
      communication_skills: Number(body.communication_skills),
      explanation         : body.explanation,
      handle_upset_users  : body.handle_upset_users,
      handle_uncertainty  : body.handle_uncertainty,
      why_join            : body.why_join,
      good_fit            : body.good_fit,
      other_experience    : body.other_experience,
      unsure_case         : body.unsure_case,
      working_mic         : body.working_mic,
      understand_abuse    : body.understand_abuse,
      additional_questions: body.additional_questions,
      created_at          : Date.now()
    }

    // - SUBMIT TO DB - \\
    try {
      await submit_application(application_data)
    } catch (db_err) {
      console.error("[ - STAFF APP SUBMIT API - ] DB insert error:", (db_err as Error).message)
      return NextResponse.json({ error: "Database error: " + (db_err as Error).message }, { status: 500 })
    }

    // - SEND DISCORD NOTIFICATION - \\
    await send_discord_notification(application_data, application_uuid).catch(() => {})

    return NextResponse.json({ success: true, uuid: application_uuid, message: "Application submitted successfully!" }, { status: 201 })
  } catch (error) {
    console.error("[ - STAFF APP SUBMIT API - ] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/**
 * @route DELETE /api/staff-application
 * @description Delete the authenticated user's staff application (allows resubmission)
 */
export async function DELETE(req: NextRequest) {
  try {
    const discord_user_cookie = req.cookies.get("discord_user")
    if (!discord_user_cookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = JSON.parse(discord_user_cookie.value)
    if (!user || !user.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    await connect()
    const deleted = await delete_application(user.id)

    if (!deleted) {
      return NextResponse.json({ error: "No application found to delete." }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Application deleted. You may resubmit." })
  } catch (error) {
    console.error("[ - STAFF APP DELETE API - ] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
