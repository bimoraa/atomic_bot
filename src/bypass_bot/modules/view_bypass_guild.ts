import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js"
import { Command } from "@shared/types/command"
import { component, db } from "@shared/utils"

interface guild_settings_record {
  guild_id  : string
  settings? : {
    bypass_channel? : string
  }
}

const ALLOWED_USER_ID = "1118453649727823974"
const MAX_ROWS        = 40

/**
 * - VIEW BYPASS GUILD COMMAND - \\
 */
const view_bypass_guild_command: Command = {
  data: new SlashCommandBuilder()
    .setName("view-bypass-guild")
    .setDescription("View guilds that configured bypass channel"),

  execute: async (interaction: ChatInputCommandInteraction) => {
    if (interaction.user.id !== ALLOWED_USER_ID) {
      const denied_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Access Denied",
                "",
                "You are not allowed to use this command.",
              ]),
            ],
          }),
        ],
      })

      denied_message.flags = (denied_message.flags ?? 0) | 64

      await interaction.reply(denied_message)
      return
    }

    await interaction.deferReply({ ephemeral: true })

    try {
      const records = await db.find_many<guild_settings_record>("guild_settings", {})

      const bypass_rows = records
        .filter((record) => Boolean(record.settings?.bypass_channel))
        .sort((left, right) => left.guild_id.localeCompare(right.guild_id))

      if (bypass_rows.length === 0) {
        const empty_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## View Bypass Guild",
                  "",
                  "No guild has `bypass_channel` configured yet.",
                ]),
              ],
            }),
          ],
        })

        empty_message.flags = (empty_message.flags ?? 0) | 64

        await interaction.editReply(empty_message)
        return
      }

      const visible_rows = bypass_rows.slice(0, MAX_ROWS)
      const lines = visible_rows.map((record, index) => {
        const guild_name = interaction.client.guilds.cache.get(record.guild_id)?.name || "Unknown Guild"
        const channel_id = record.settings?.bypass_channel || "-"

        return `${index + 1}. ${guild_name} (${record.guild_id}) -> <#${channel_id}>`
      })

      const summary_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## View Bypass Guild",
                "",
                `Total: ${bypass_rows.length} guild(s)`,
                ...lines,
                bypass_rows.length > MAX_ROWS
                  ? `... and ${bypass_rows.length - MAX_ROWS} more guild(s)`
                  : "",
              ].filter(Boolean)),
            ],
          }),
        ],
      })

      summary_message.flags = (summary_message.flags ?? 0) | 64

      await interaction.editReply(summary_message)
    } catch (error) {
      console.error("[ - BYPASS - ] Failed to view bypass guild list:", error)

      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Error",
                "",
                "Failed to fetch bypass guild data.",
              ]),
            ],
          }),
        ],
      })

      error_message.flags = (error_message.flags ?? 0) | 64

      await interaction.editReply(error_message)
    }
  },
}

export default view_bypass_guild_command
