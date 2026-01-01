import { ButtonInteraction, GuildMember } from "discord.js"
import { api, component, time } from "../../../utils"
import { create_key_for_project, delete_user_from_project } from "../../../services/luarmor"
import { add_work_log } from "../../../services/work_tracker"

const ADMIN_ROLE_ID = "1277272542914281512"
const LOGO_URL = "https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_logo.png?raw=true"
const LOG_CHANNEL_ID = "1392574025498366061"

function generate_payment_id(): string {
  const random = Math.floor(1000 + Math.random() * 9000)
  return `ATMC-${random}`
}

function parse_payment_message(message: any): {
  amount: string
  customer_id: string
  method: string
  submitter_id: string
  details: string
  timestamp: string
  proof_urls: { url: string; description: string }[]
} | null {
  try {
    const container = message.components?.[0]
    if (!container) return null

    const text_component = container.components?.find((c: any) => c.type === 10)
    const gallery_component = container.components?.find((c: any) => c.type === 12)

    if (!text_component) return null

    const content = text_component.content || ""
    const lines = content.split("\n")

    let amount = ""
    let customer_id = ""
    let method = ""
    let submitter_id = ""
    let details = ""
    let timestamp = ""

    for (const line of lines) {
      if (line.includes("Amount:")) {
        const match = line.match(/\*\*(.+?)\*\*/)
        amount = match ? match[1] : ""
      }
      if (line.includes("Customer:")) {
        const match = line.match(/<@(\d+)>/)
        customer_id = match ? match[1] : ""
      }
      if (line.includes("Payment Method:")) {
        const match = line.match(/\*\*(.+?)\*\*/)
        method = match ? match[1] : ""
      }
      if (line.includes("Submitted by:")) {
        const match = line.match(/<@(\d+)>/)
        submitter_id = match ? match[1] : ""
      }
      if (line.includes("Details:")) {
        const match = line.match(/\*\*(.+?)\*\*/)
        details = match ? match[1] : ""
      }
      if (line.includes("Time:")) {
        const match = line.match(/Time: (.+)/)
        timestamp = match ? match[1].trim() : ""
      }
    }

    const proof_urls: { url: string; description: string }[] = []
    if (gallery_component?.items) {
      for (let i = 0; i < gallery_component.items.length; i++) {
        const item = gallery_component.items[i]
        proof_urls.push({
          url: item.media?.url || "",
          description: `Bukti ${i + 1}`,
        })
      }
    }

    return { amount, customer_id, method, submitter_id, details, timestamp, proof_urls }
  } catch {
    return null
  }
}

export async function handle_payment_approve(interaction: ButtonInteraction) {
  const member = interaction.member as GuildMember

  if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
    await interaction.reply({
      content: "Only admins can approve payments.",
      flags: 64,
    })
    return
  }

  await interaction.deferReply({ flags: 64 })

  const parts        = interaction.customId.split("_")
  const submitter_id = parts[2]
  const amount       = parseInt(parts[3]) || 0
  const customer_id  = parts[4]
  const thread_id    = parts[5]
  const message_link = `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${interaction.message.id}`
  const thread_link  = `https://discord.com/channels/${interaction.guildId}/${thread_id}`
  const whitelist_note = `WHITELISTED by <@${interaction.user.id}> - at ${time.full_date_time(time.now())}`

  const payment_data = parse_payment_message(interaction.message)
  const payment_id   = generate_payment_id()

  const processing_message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## <:rbx:1447976733050667061> | Processing Payment...`,
            `> Admin <@${interaction.user.id}> is processing this payment.`,
            ``,
            `- <:money:1381580383090380951> Amount: **${payment_data?.amount || "Unknown"}**`,
            `- <:USERS:1381580388119613511> Customer: <@${customer_id}>`,
            `- <:calc:1381580377340117002> Payment Method: **${payment_data?.method || "Unknown"}**`,
            `- <:JOBSS:1381580390330011732> Submitted by: <@${submitter_id}>`,
            `- <:app:1381680319207575552> Details: **${payment_data?.details || "Unknown"}**`,
            `- <:OLOCK:1381580385892171816> Time: ${payment_data?.timestamp || "Unknown"}`,
          ]),
          component.divider(2),
          component.action_row(
            component.success_button("Approve", `payment_approve_${submitter_id}_${amount}_${customer_id}_${thread_id}`, undefined, true),
            component.danger_button("Reject", `payment_reject_${submitter_id}_${amount}_${customer_id}_${thread_id}`, undefined, true)
          ),
        ],
      }),
    ],
  })

  await api.edit_components_v2(
    interaction.channelId,
    interaction.message.id,
    api.get_token(),
    processing_message
  )

  const submitter  = await interaction.guild?.members.fetch(submitter_id).catch(() => null)
  const staff_name = submitter?.user.username || `Unknown (${submitter_id})`

  await delete_user_from_project(
    "6958841b2d9e5e049a24a23e376e0d77",
    customer_id,
  )

  const whitelist_result = await create_key_for_project(
    "6958841b2d9e5e049a24a23e376e0d77",
    {
      discord_id : customer_id,
      note       : whitelist_note,
    }
  )

  if (!whitelist_result.success || !whitelist_result.data?.user_key) {
    const error_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## <:rbx:1447976733050667061> | Payment Failed`,
              `> Failed to whitelist user. Please try again.`,
              ``,
              `- <:money:1381580383090380951> Amount: **${payment_data?.amount || "Unknown"}**`,
              `- <:USERS:1381580388119613511> Customer: <@${customer_id}>`,
              `- <:calc:1381580377340117002> Payment Method: **${payment_data?.method || "Unknown"}**`,
              `- <:JOBSS:1381580390330011732> Submitted by: <@${submitter_id}>`,
              `- <:app:1381680319207575552> Details: **${payment_data?.details || "Unknown"}**`,
              `- <:OLOCK:1381580385892171816> Time: ${payment_data?.timestamp || "Unknown"}`,
            ]),
            component.divider(2),
            component.action_row(
              component.success_button("Approve", `payment_approve_${submitter_id}_${amount}_${customer_id}_${thread_id}`),
              component.danger_button("Reject", `payment_reject_${submitter_id}_${amount}_${customer_id}_${thread_id}`)
            ),
          ],
        }),
      ],
    })

    await api.edit_components_v2(
      interaction.channelId,
      interaction.message.id,
      api.get_token(),
      error_message
    )

    await interaction.editReply({ content: "Failed to whitelist user. Please try again." })
    return
  }

  await add_work_log(
    submitter_id,
    staff_name,
    "ticket",
    message_link,
    undefined,
    amount
  )

  await add_work_log(
    interaction.user.id,
    interaction.user.username,
    "whitelist",
    message_link,
    undefined,
    amount
  )

  const approved_message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## <:money:1381580383090380951> | Whitelisted!`,
              `Your payment has been approved and you have been whitelisted!`,
            ],
            thumbnail: LOGO_URL,
          }),
        ],
      }),
    ],
  })

  await api.send_components_v2(thread_id, api.get_token(), approved_message)

  try {
    const customer = await interaction.client.users.fetch(customer_id)
    const dm_channel = await customer.createDM()
    await api.send_components_v2(dm_channel.id, api.get_token(), approved_message)
  } catch (err) {
    console.error("[DM Error]", err)
  }

  const gallery_items: component.gallery_item[] = payment_data?.proof_urls.map(p =>
    component.gallery_item(p.url, p.description)
  ) || []

  const done_message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## <:rbx:1447976733050667061> | Payment Done!`,
            `> Approve tanpa ngecek bukti dulu = instant demote`,
            ``,
            `### Payment Information`,
            `- <:money:1381580383090380951> Amount: **${payment_data?.amount || "Unknown"}**`,
            `- <:USERS:1381580388119613511> Customer Discord: <@${customer_id}>`,
            `- <:calc:1381580377340117002> Payment Method: **${payment_data?.method || "Unknown"}**`,
            `- <:JOBSS:1381580390330011732> Submitted by: <@${submitter_id}>`,
            `- <:app:1381680319207575552> Transaction Details: **${payment_data?.details || "Unknown"}**`,
            `- <:OLOCK:1381580385892171816> Time: ${payment_data?.timestamp || time.full_date_time(time.now())}`,
            ``,
            `### Approval Information`,
            `- <:USERS:1381580388119613511> Approved by: <@${interaction.user.id}>`,
            `- <:app:1381680319207575552> Payment ID: **${payment_id}**`,
          ]),
          component.divider(2),
          ...(gallery_items.length > 0 ? [component.media_gallery(gallery_items), component.divider(2)] : []),
          component.action_row(
            component.link_button("View Ticket (Thread)", thread_link)
          ),
        ],
      }),
    ],
  })

  await api.send_components_v2(LOG_CHANNEL_ID, api.get_token(), done_message)

  await api.delete_message(interaction.channelId, interaction.message.id, api.get_token())

  await interaction.editReply({ content: `Payment approved! ID: **${payment_id}**` })
}

export async function handle_payment_reject(interaction: ButtonInteraction) {
  const member = interaction.member as GuildMember

  if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
    await interaction.reply({
      content: "Only admins can reject payments.",
      flags: 64,
    })
    return
  }

  await interaction.deferReply({ flags: 64 })

  await api.delete_message(interaction.channelId, interaction.message.id, api.get_token())

  await interaction.editReply({ content: "Payment rejected." })
}
