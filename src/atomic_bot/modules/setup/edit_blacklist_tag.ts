import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
}                            from "discord.js"
import { Command }           from "@shared/types/command"
import { component }         from "@shared/utils"
import { log_error }         from "@shared/utils/error_logger"
import {
  add_banned_tag,
  remove_banned_tag,
  list_banned_tags,
}                            from "@shared/database/settings/server_tag"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("edit-blacklist-tag")
    .setDescription("Manage the server tag auto-quarantine blacklist")
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add a tag to the blacklist")
        .addStringOption(opt =>
          opt
            .setName("value")
            .setDescription("The server tag to blacklist (e.g. ENVY)")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove a tag from the blacklist")
        .addStringOption(opt =>
          opt
            .setName("value")
            .setDescription("The server tag to remove from the blacklist")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("Show all currently blacklisted tags")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    try {
      const sub = interaction.options.getSubcommand()

      if (sub === "add") {
        const value  = interaction.options.getString("value", true).trim()
        const added  = await add_banned_tag(value)
        const upper  = value.toUpperCase()

        const message = component.build_message({
          components: [
            component.container({
              accent_color : added ? component.from_hex("#57F287") : component.from_hex("#FEE75C"),
              components   : [
                component.text([
                  added
                    ? `## Tag Added to Blacklist`
                    : `## Tag Already Blacklisted`,
                  added
                    ? `Tag \`${upper}\` has been added to the blacklist.`
                    : `Tag \`${upper}\` is already in the blacklist.`,
                ]),
              ],
            }),
          ],
        })

        await interaction.editReply(message)

      } else if (sub === "remove") {
        const value   = interaction.options.getString("value", true).trim()
        const removed = await remove_banned_tag(value)
        const upper   = value.toUpperCase()

        const message = component.build_message({
          components: [
            component.container({
              accent_color : removed ? component.from_hex("#57F287") : component.from_hex("#ED4245"),
              components   : [
                component.text([
                  removed
                    ? `## Tag Removed from Blacklist`
                    : `## Tag Not Found`,
                  removed
                    ? `Tag \`${upper}\` has been removed from the blacklist.`
                    : `Tag \`${upper}\` was not found in the blacklist.`,
                ]),
              ],
            }),
          ],
        })

        await interaction.editReply(message)

      } else if (sub === "list") {
        const tags = await list_banned_tags()

        const tag_lines = tags.length > 0
          ? tags.map((t, i) => `${i + 1}. \`${t}\``).join("\n")
          : "- No tags currently blacklisted."

        const message = component.build_message({
          components: [
            component.container({
              accent_color : component.from_hex("#5865F2"),
              components   : [
                component.text([
                  `## Blacklisted Server Tags`,
                  `Total: **${tags.length}**`,
                  ``,
                  tag_lines,
                ]),
              ],
            }),
          ],
        })

        await interaction.editReply(message)
      }

    } catch (error) {
      await log_error(interaction.client, error as Error, "edit-blacklist-tag", {
        user_id  : interaction.user.id,
        guild_id : interaction.guildId ?? "unknown",
      }).catch(() => {})

      const err_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Error",
                "An unexpected error occurred while updating the blacklist.",
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(err_message).catch(() => {})
    }
  },
}
