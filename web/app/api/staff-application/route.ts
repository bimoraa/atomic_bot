import { NextRequest, NextResponse } from "next/server"
import { randomUUID }                from "crypto"
import { encrypt_session, decrypt_session } from "@/lib/utils/session"
import { has_user_applied, submit_application, delete_application, staff_application, get_user_application_uuid } from "@/lib/database/managers/staff_application_manager"
import { connect }                   from "@/lib/utils/database"

export const dynamic = 'force-dynamic'

const __discord_api        = "https://discord.com/api/v10"
const __application_channel = "1391997695425515531"
const __blacklist_role_id  = "1266021026157035721"
const __bot_url            = process.env.NEXT_PUBLIC_BOT_URL || 'https://atomicbot-production.up.railway.app'

/**
 * @description Sends a DM to the user after they successfully apply.
 * @param discord_id - The user's Discord ID
 */
async function send_dm_notification(discord_id: string): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) return

  try {
    const channel_res = await fetch(`${__discord_api}/users/@me/channels`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ recipient_id: discord_id })
    })

    if (!channel_res.ok) {
      console.error("[ - STAFF APP DM - ] Failed to create DM:", await channel_res.text())
      return
    }

    const channel_data = await channel_res.json()
    
    const message_body = {
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: "## Thank you for applying to be a staff member!"
            }
          ]
        },
        {
          type: 17,
          components: [
            {
              type: 10,
              content: "Terima kasih banyak sudah mendaftarkan diri untuk menjadi bagian dari tim kami. Saat ini, formulir pendaftaran kamu sedang dalam proses review oleh tim kami. Kami benar-benar mengapresiasi waktu, usaha, dan niat baik yang sudah kamu berikan untuk bergabung bersama kami.\n\nJika kamu lolos ke tahap berikutnya, kami akan segera menghubungi kamu melalui discord ini. \n\nSekali lagi, terima kasih atas minat dan antusiasmenya karna mau menjadi bagian dari perjalanan tim kami. Semoga kita bisa segera bekerja sama dan berkembang bersama! 💙\n\nStay tuned yaa, dan makasih banyakkk! 🙌\n"
            },
            {
              type: 14,
              spacing: 2
            },
            {
              type: 10,
              content: "*~ Best Regads,\nOur Executive Director & RDoM*"
            }
          ]
        }
      ]
    }

    const msg_res = await fetch(`${__discord_api}/channels/${channel_data.id}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message_body)
    })

    if (!msg_res.ok) {
      console.error("[ - STAFF APP DM - ] Failed to send DM:", await msg_res.text())
    }
  } catch (error) {
    console.error("[ - STAFF APP DM - ] Error:", error)
  }
}

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
          { type: 10, content: `- Have you ever served a buyer / been customer service before?\n> ${data.past_cs_experience}` },
          { type: 14, spacing: 2 },
          ...(data.past_cs_experience === "Yes" ? [
            { type: 10, content: `- Have you ever been a staff member in another hub/server?\n> ${data.past_staff_experience}` },
            { type: 14, spacing: 2 }
          ] : []),
          ...(data.past_staff_experience === "No" ? [
            { type: 10, content: `- Are you still actively communicating/working in that hub?\n> ${data.active_other_hub}` },
            { type: 14, spacing: 2 }
          ] : []),
          ...(data.past_staff_experience === "Yes" || data.active_other_hub === "Yes" ? [
            { type: 10, content: `- How would you handle upset users?\n> ${data.handle_upset_users}` },
            { type: 14, spacing: 2 },
            { type: 10, content: `- How would you handle uncertain situations?\n> ${data.handle_uncertainty}` },
            { type: 14, spacing: 2 },
            { type: 10, content: `- If you're unsure about how to handle a specific case, what would you do?\n> ${data.unsure_case}` },
            { type: 14, spacing: 2 }
          ] : []),
          { type: 10, content: `- Why do you want to be part of Atomic's staff team?\n> ${data.why_join}` },
          { type: 14, spacing: 2, divider: true },
          { type: 10, content: `- What makes you a good fit for the Support Representative role?\n> ${data.good_fit}` },
          { type: 14, spacing: 2 },
          { type: 10, content: `- Do you have any other languages or past experience?\n> ${data.other_experience}` },
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

    const user = await decrypt_session(discord_user_cookie.value)
    if (!user || !user.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    await connect()

    const is_localhost = req.headers.get("host")?.includes("localhost") || req.headers.get("host")?.includes("127.0.0.1")
    const is_owner     = user.id === "1118453649727823974"
    const can_bypass   = is_owner && is_localhost

    // - CHECK BLACKLIST ROLE (REALTIME: BOT API) - \\
    let blacklisted = false
    try {
      console.log("[ - BLACKLIST CHECK - ] fetching member for", user.id)
      const controller = new AbortController()
      const timeout_id = setTimeout(() => controller.abort(), 5000)

      const member_res = await fetch(
        `${__bot_url}/api/member/${user.id}`,
        { signal: controller.signal }
      )
      clearTimeout(timeout_id)

      const raw_text = await member_res.text()
      console.log("[ - BLACKLIST CHECK - ] status:", member_res.status, "body:", raw_text.slice(0, 300))

      if (member_res.ok) {
        const member_data = JSON.parse(raw_text)
        const roles: any[] = member_data.roles ?? []
        blacklisted = roles.some((r: any) =>
          typeof r === 'string' ? r === __blacklist_role_id : r.id === __blacklist_role_id
        )
        console.log("[ - BLACKLIST CHECK - ] roles count:", roles.length, "blacklisted:", blacklisted)
      }
    } catch (e) {
      console.log("[ - BLACKLIST CHECK - ] error:", (e as Error).message)
    }

    const uuid    = can_bypass ? null : await get_user_application_uuid(user.id)
    const applied = !!uuid
    return NextResponse.json({ applied, blacklisted, uuid })
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

    const user = await decrypt_session(discord_user_cookie.value)
    if (!user || !user.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    await connect()

    const is_localhost = req.headers.get("host")?.includes("localhost") || req.headers.get("host")?.includes("127.0.0.1")
    const is_owner     = user.id === "1118453649727823974"
    const can_bypass   = is_owner && is_localhost

    // - CHECK IF RECRUITMENT IS OPEN - \\
    const { get_recruitment_settings } = await import('@/lib/database/managers/recruitment_settings_manager')
    const settings = await get_recruitment_settings()
    if (!settings.is_open && !can_bypass) {
      return NextResponse.json({ error: "Recruitment is currently closed." }, { status: 403 })
    }

    if (!can_bypass) {
      const already_applied = await has_user_applied(user.id)
      if (already_applied) {
        return NextResponse.json({ error: "You have already submitted an application. Please wait for the results." }, { status: 409 })
      }
    }

    try {
      const controller = new AbortController()
      const timeout_id = setTimeout(() => controller.abort(), 3000)
      const member_res = await fetch(`${__bot_url}/api/member/${user.id}`, { signal: controller.signal })
      clearTimeout(timeout_id)
      
      if (member_res.ok) {
        const member_data = JSON.parse(await member_res.text())
        const roles: any[] = member_data.roles ?? []
        const is_blacklisted = roles.some((r: any) =>
          typeof r === 'string' ? r === __blacklist_role_id : r.id === __blacklist_role_id
        )
        if (is_blacklisted) {
          return NextResponse.json({ error: "Your account is blacklisted." }, { status: 403 })
        }
      }
    } catch (e) {
      // Ignore network errors here to not block legitimate users if bot API is down, 
      // but it's an extra layer of security.
    }

    // - PARSE BODY - \\
    const body = await req.json()

    // - FIELD LENGTH LIMITS - \\
    const __max_short = 200
    const __max_long  = 2000
    const __text_fields: [string, number][] = [
      ['full_name',            __max_short],
      ['why_join',             __max_long],
      ['good_fit',             __max_long],
      ['other_experience',     __max_long],
      ['additional_questions', __max_long],
      ['handle_upset_users',   __max_long],
      ['handle_uncertainty',   __max_long],
      ['unsure_case',          __max_long],
    ]
    for (const [field, max] of __text_fields) {
      if (body[field] && typeof body[field] === 'string') {
        body[field] = body[field].trim()
        if (body[field].length > max) {
          return NextResponse.json({ error: `Field '${field}' exceeds maximum length of ${max} characters` }, { status: 400 })
        }
      }
    }

    // - VALIDATE REQUIRED FIELDS - \\
    const required_fields = [
      "full_name", "dob", "languages", "past_cs_experience",
      "why_join", "good_fit", "other_experience",
      "working_mic", "understand_abuse", "additional_questions"
    ]

    for (const field of required_fields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // - VALIDATE DOB - \\
    const dob_date = new Date(body.dob)
    if (isNaN(dob_date.getTime())) {
      return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 })
    }
    const age_years = (Date.now() - dob_date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    if (age_years < 13) {
      return NextResponse.json({ error: 'You must be at least 13 years old to apply' }, { status: 400 })
    }

    if (body.past_cs_experience === "Yes") {
      if (!body.past_staff_experience) {
        return NextResponse.json({ error: `Missing required field: past_staff_experience` }, { status: 400 })
      }
      
      if (body.past_staff_experience === "No") {
        if (!body.active_other_hub) {
          return NextResponse.json({ error: `Missing required field: active_other_hub` }, { status: 400 })
        }
      }

      if (body.past_staff_experience === "Yes" || body.active_other_hub === "Yes") {
        const scenario_fields = ["handle_upset_users", "handle_uncertainty", "unsure_case"]
        for (const field of scenario_fields) {
          if (!body[field]) {
            return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
          }
        }
      }
    }

    // - CHECK IF ALREADY APPLIED - \\
    await connect()
    if (!can_bypass) {
      if (await has_user_applied(user.id)) {
        return NextResponse.json({ error: "You have already submitted an application." }, { status: 403 })
      }
    }

    // - BUILD APPLICATION DATA - \\
    const application_uuid = randomUUID()

    const application_data: staff_application = {
      uuid                : application_uuid,
      discord_id          : user.id,
      discord_username    : user.username,
      discord_avatar      : user.avatar,
      full_name           : body.full_name,
      dob                 : new Date(body.dob).toISOString(),
      languages           : body.languages,
      past_cs_experience  : body.past_cs_experience,
      past_staff_experience: body.past_staff_experience || "",
      active_other_hub    : body.active_other_hub || "",
      handle_upset_users  : body.handle_upset_users || "",
      handle_uncertainty  : body.handle_uncertainty || "",
      why_join            : body.why_join,
      good_fit            : body.good_fit,
      other_experience    : body.other_experience,
      unsure_case         : body.unsure_case || "",
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

    // - SEND DISCORD NOTIFICATIONS - \\
    await send_discord_notification(application_data, application_uuid).catch(() => {})
    await send_dm_notification(user.id).catch(() => {})

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

    const user = await decrypt_session(discord_user_cookie.value)
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
