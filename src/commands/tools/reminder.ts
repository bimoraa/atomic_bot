import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                           from "../../types/command"
import { api, component, format, time }                      from "../../utils"
import { log_error }                                         from "../../utils/error_logger"

const is_dev        = process.env.NODE_ENV === "development"
const discord_token = is_dev ? process.env.DEV_DISCORD_TOKEN : process.env.DISCORD_TOKEN
const reminder_tasks = new Map<string, ReturnType<typeof setTimeout>>()
const max_minutes    = 10080

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("reminder")
    .setDescription("Set a DM reminder")
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription("Minutes until reminder")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(max_minutes)
    )
    .addStringOption((option) =>
      option
        .setName("note")
        .setDescription("Reminder note")
        .setRequired(true)
        .setMaxLength(500)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const minutes_option = interaction.options.getInteger("minutes", true)
    const note_option    = interaction.options.getString("note", true)

    if (!discord_token) {
      await interaction.reply({ content: "Bot token missing", ephemeral: true })
      return
    }

    const minutes   = Math.max(1, Math.min(minutes_option, max_minutes))
    const note      = note_option.slice(0, 500)
    const remind_at = Math.floor((Date.now() + minutes * 60000) / 1000)
    const key       = `${interaction.user.id}:${remind_at}`

    const confirmation = component.build_message({
      components: [
        component.container({
          accent_color: 0x57F287,
          components: [
            component.text("### Reminder scheduled"),
            component.divider(),
            component.text([
              `${format.bold("Note:")} ${note}`,
              `${format.bold("Will DM at:")} ${time.full_date_time(remind_at)} (${time.relative_time(remind_at)})`,
            ]),
          ],
        }),
      ],
    })

    await interaction.reply({
      ...confirmation,
      flags: (confirmation.flags ?? 0) | 64,
    })

    const timeout = setTimeout(async () => {
      try {
        const dm_payload = component.build_message({
          components: [
            component.container({
              accent_color: 0x5865F2,
              components: [
                component.text([
                  `## Reminder`,
                  `${format.bold("Note:")} ${note}`,
                  `${format.bold("Requested by:")} ${format.user_mention(interaction.user.id)}`,
                  `${format.bold("Scheduled:")} ${time.full_date_time(remind_at)}`,
                  `${format.bold("Relative:")} ${time.relative_time(remind_at)}`,
                ]),
              ],
            }),
          ],
        })

        const result = await api.send_dm(interaction.user.id, discord_token, dm_payload)
        if ((result as any)?.error) {
          throw new Error("Failed to send reminder DM")
        }
      } catch (err) {
        await log_error(interaction.client, err as Error, "Reminder DM", {
          user      : interaction.user.tag,
          user_id   : interaction.user.id,
          remind_at : remind_at,
          minutes   : minutes,
          note      : note,
        }).catch(() => {})
      } finally {
        reminder_tasks.delete(key)
      }
    }, minutes * 60000)

    reminder_tasks.set(key, timeout)
  },
}
