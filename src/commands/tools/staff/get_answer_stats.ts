import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember } from "discord.js"
import { Command } from "../../../types/command"
import { component, api, db } from "../../../utils"
import { staff_role_id } from "../../../services/permissions"

const COLLECTION_NAME = "answer_stats"

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

export async function get_staff_stats(staff_id: string): Promise<AnswerStat | null> {
  if (!db.is_connected()) return null
  return db.find_one<AnswerStat>(COLLECTION_NAME, { staff_id })
}

export function build_stats_panel(
  staff_id: string,
  staff_name: string,
  staff_avatar: string,
  stats: AnswerStat | null
): component.message_payload {
  const week_key     = get_week_key()
  const weekly_count = stats?.weekly?.[week_key] ?? 0
  const total_count  = stats?.total ?? 0

  const recent_weeks = Object.entries(stats?.weekly ?? {})
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 4)
    .map(([week, count]) => `${week}: **${count}** answers`)
    .join("\n") || "No data"

  return component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Answer Stats`,
              `**Staff:** <@${staff_id}>`,
            ],
            thumbnail: staff_avatar,
          }),
          component.divider(),
          component.text([
            `### Current Week (${week_key})`,
            `**${weekly_count}** answers`,
          ]),
          component.divider(),
          component.text([
            `### Total All Time`,
            `**${total_count}** answers`,
          ]),
          component.divider(),
          component.text([
            `### Recent Weeks`,
            recent_weeks,
          ]),
        ],
      }),
    ],
  })
}

export async function build_staff_dropdown(
  guild_members: GuildMember[]
): Promise<component.message_payload> {
  const staff_members = guild_members
    .filter(m => m.roles.cache.has(staff_role_id))
    .slice(0, 25)

  const options = staff_members.map(m => ({
    label: m.displayName,
    value: m.id,
    description: `@${m.user.username}`,
  }))

  if (options.length === 0) {
    return component.build_message({
      components: [
        component.container({
          components: [
            component.text("No staff members found."),
          ],
        }),
      ],
    })
  }

  return component.build_message({
    components: [
      component.container({
        components: [
          component.text("## Select a Staff Member"),
          component.text("Choose a staff member to view their answer stats."),
          component.select_menu("answer_stats_select", "Select staff member...", options),
        ],
      }),
    ],
  })
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("get-answer-stats")
    .setDescription("View answer stats for staff members"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const guild = interaction.guild
    if (!guild) {
      await interaction.editReply({ content: "This command can only be used in a server." })
      return
    }

    const members = await guild.members.fetch()
    const message = await build_staff_dropdown([...members.values()])

    await api.edit_interaction_response(
      interaction.client.user.id,
      interaction.token,
      message
    )
  },
}

export default command
