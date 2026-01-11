import { ButtonInteraction, TextChannel, GuildMember, ChannelType, ThreadChannel } from "discord.js"
import { component, api, db } from "../../../../shared/utils"
import { 
  ask_channel_id, 
  create_thread_for_message,
  build_question_panel_no_answer 
} from "../../../../modules/staff/staff/ask"
import { is_staff, is_admin_or_mod } from "../../../../shared/database/settings/permissions"

const ANSWER_LOG_CHANNEL_ID = "1446894637980713090"
const COLLECTION_NAME       = "answer_stats"

interface AnswerStat {
  staff_id: string
  weekly: { [week_key: string]: number }
  total: number
}

function get_week_key(): string {
  const now   = new Date()
  const year  = now.getFullYear()
  const start = new Date(year, 0, 1)
  const diff  = now.getTime() - start.getTime()
  const week  = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7)
  return `${year}-W${week}`
}

async function increment_stat(staff_id: string): Promise<number> {
  const week_key = get_week_key()
  
  await db.update_jsonb_field(
    COLLECTION_NAME,
    { staff_id },
    "weekly",
    week_key,
    1
  )

  const stat = await db.find_one<AnswerStat>(COLLECTION_NAME, { staff_id })
  return stat?.weekly?.[week_key] ?? 1
}

async function get_or_create_staff_thread(
  log_channel: TextChannel,
  staff_id: string,
  staff_name: string
): Promise<ThreadChannel | null> {
  const threads = await log_channel.threads.fetch()
  
  for (const [, thread] of threads.threads) {
    if (thread.name.startsWith(staff_id)) {
      return thread
    }
  }

  const archived = await log_channel.threads.fetchArchived()
  for (const [, thread] of archived.threads) {
    if (thread.name.startsWith(staff_id)) {
      await thread.setArchived(false)
      return thread
    }
  }

  try {
    const thread = await log_channel.threads.create({
      name: `${staff_id} - ${staff_name}`,
      type: ChannelType.PublicThread,
      autoArchiveDuration: 10080,
    })
    return thread
  } catch {
    return null
  }
}

async function log_answer(
  interaction: ButtonInteraction,
  question_user_id: string,
  question: string,
  thread_id: string,
  weekly_count: number
): Promise<void> {
  const log_channel = interaction.client.channels.cache.get(ANSWER_LOG_CHANNEL_ID) as TextChannel
  if (!log_channel) return

  const staff        = interaction.member as GuildMember
  const staff_thread = await get_or_create_staff_thread(log_channel, staff.id, staff.displayName)
  if (!staff_thread) return

  const timestamp   = Math.floor(Date.now() / 1000)
  const staff_avatar = staff.displayAvatarURL({ extension: "png", size: 128 })

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Answer Log`,
              `**Staff:** <@${staff.id}>`,
              `**Time:** <t:${timestamp}:F>`,
            ],
            thumbnail: staff_avatar,
          }),
          component.divider(),
          component.text([
            `**Question from:** <@${question_user_id}>`,
            `**Question:** ${question.slice(0, 200)}${question.length > 200 ? "..." : ""}`,
            `**Thread:** <#${thread_id}>`,
          ]),
          component.divider(),
          component.text(`**Weekly Stats:** ${weekly_count} answers this week`),
        ],
      }),
    ],
  })

  await api.send_components_v2(staff_thread.id, api.get_token(), message)
}

function extract_question_data(interaction: ButtonInteraction): {
  user_id: string
  question: string
  timestamp: number
  user_avatar: string
} | null {
  const message = interaction.message
  
  const content = JSON.stringify(message.components)
  
  const user_match = content.match(/Question from <@(\d+)>/)
  const user_id    = user_match?.[1] ?? ""
  
  const question_match = content.match(/Question: ([^"]+)/)
  const question       = question_match?.[1]?.replace(/\\n/g, "\n").trim() ?? ""
  
  const timestamp_match = content.match(/<t:(\d+):F>/)
  const timestamp       = timestamp_match?.[1] ? parseInt(timestamp_match[1]) : Math.floor(Date.now() / 1000)

  const thumbnail_match = content.match(/"url":"([^"]+)"/)
  const user_avatar     = thumbnail_match?.[1] ?? ""

  if (!user_id) return null

  return { user_id, question, timestamp, user_avatar }
}

export async function handle_ask_answer(interaction: ButtonInteraction): Promise<void> {
  const member = interaction.member as GuildMember

  if (!is_staff(member) && !is_admin_or_mod(member)) {
    await interaction.reply({
      content: "Only staff can answer questions.",
      ephemeral: true,
    })
    return
  }

  await interaction.deferUpdate()

  const message = interaction.message
  
  if (message.thread) {
    return
  }

  const channel = interaction.client.channels.cache.get(ask_channel_id) as TextChannel
  if (!channel) return

  const data = extract_question_data(interaction)
  if (!data) return

  const user     = await interaction.client.users.fetch(data.user_id).catch(() => null)
  const username = user?.username ?? "Unknown"

  const thread_id = await create_thread_for_message(
    channel,
    message.id,
    data.user_id,
    username
  )

  if (thread_id) {
    const updated_message = build_question_panel_no_answer(
      data.user_id,
      data.user_avatar,
      data.question,
      data.timestamp
    )

    await api.edit_components_v2(
      ask_channel_id,
      message.id,
      api.get_token(),
      updated_message
    )

    const weekly_count = await increment_stat(member.id)
    await log_answer(interaction, data.user_id, data.question, thread_id, weekly_count)
  }
}
