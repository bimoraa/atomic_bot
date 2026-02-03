import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                                                  from "../../shared/types/command"
import { component }                                                                from "../../shared/utils"
import { log_error }                                                                from "../../shared/utils/error_logger"
import {
  add_notification,
  remove_notification,
  get_user_subscriptions,
  get_member_suggestions,
}                                                                                   from "../../core/handlers/controllers/idn_live_controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("notify")
    .setDescription("Manage JKT48 IDN Live notifications")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Subscribe to a member's live notifications")
        .addStringOption((option) =>
          option
            .setName("member")
            .setDescription("Member name (e.g., Zee, Freya, Gita)")
            .setAutocomplete(true)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Live platform")
            .setRequired(true)
            .addChoices(
              { name: "IDN", value: "idn" },
              { name: "Showroom", value: "showroom" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Unsubscribe from a member's live notifications")
        .addStringOption((option) =>
          option
            .setName("member")
            .setDescription("Member name")
            .setAutocomplete(true)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Live platform")
            .setRequired(false)
            .addChoices(
              { name: "IDN", value: "idn" },
              { name: "Showroom", value: "showroom" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("View your notification subscriptions")
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const subcommand = interaction.options.getSubcommand()

    try {
      if (subcommand === "add") {
        const member_name = interaction.options.getString("member", true)
        const live_type   = interaction.options.getString("type", true)

        const result = await add_notification({
          user_id     : interaction.user.id,
          member_name : member_name,
          client      : interaction.client,
          type        : live_type,
        })

        if (!result.success) {
          await interaction.editReply({
            content : result.error || "Failed to add notification.",
          })
          return
        }

        const success_message = component.build_message({
          components: [
            component.container({
              accent_color : 0x57F287,
              components   : [
                component.text("## Notification Subscribed"),
              ],
            }),
            component.container({
              components: [
                component.text([
                  result.message || "Successfully subscribed!",
                  "",
                  "You will receive a DM notification when this member goes live on IDN.",
                ]),
              ],
            }),
          ],
        })

        await interaction.editReply(success_message)
      } else if (subcommand === "remove") {
        const member_name = interaction.options.getString("member", true)
        const live_type   = interaction.options.getString("type") || "idn"

        const result = await remove_notification({
          user_id     : interaction.user.id,
          member_name : member_name,
          client      : interaction.client,
          type        : live_type,
        })

        if (!result.success) {
          await interaction.editReply({
            content : result.error || "Failed to remove notification.",
          })
          return
        }

        const success_message = component.build_message({
          components: [
            component.container({
              accent_color : 0xFEE75C,
              components   : [
                component.text("## Notification Unsubscribed"),
              ],
            }),
            component.container({
              components: [
                component.text(result.message || "Successfully unsubscribed!"),
              ],
            }),
          ],
        })

        await interaction.editReply(success_message)
      } else if (subcommand === "list") {
        const subscriptions = await get_user_subscriptions(interaction.user.id, interaction.client)

        if (subscriptions.length === 0) {
          await interaction.editReply({
            content : "You have no active notification subscriptions. Use `/notify add` to subscribe to a member.",
          })
          return
        }

        const member_list = subscriptions
          .map((sub, index) => {
            const platform = (sub.type || "idn").toUpperCase()
            return `${index + 1}. **${sub.member_name}** (${platform})`
          })
          .join("\n")

        const list_message = component.build_message({
          components: [
            component.container({
              accent_color : 0x5865F2,
              components   : [
                component.text("## Your Notification Subscriptions"),
              ],
            }),
            component.container({
              components: [
                component.text([
                  `You are subscribed to **${subscriptions.length}** member(s):`,
                  "",
                  member_list,
                  "",
                  "Use `/notify remove` to unsubscribe from any member.",
                ]),
              ],
            }),
          ],
        })

        await interaction.editReply(list_message)
      }
    } catch (error) {
      await log_error(interaction.client, error as Error, "notify_command", { subcommand })
      await interaction.editReply({
        content : "An error occurred while processing your request.",
      }).catch(() => {})
    }
  },

  /**
   * - NOTIFY AUTOCOMPLETE - \\
   * @param {AutocompleteInteraction} interaction - Autocomplete interaction
   * @returns {Promise<void>}
   */
  async autocomplete(interaction: AutocompleteInteraction) {
    const focused_value = interaction.options.getFocused()
    const subcommand    = interaction.options.getSubcommand()
    const include_live  = subcommand !== "remove"
    const platform      = interaction.options.getString("type") || "idn"

    try {
      const suggestions = await get_member_suggestions({
        query        : focused_value,
        user_id      : interaction.user.id,
        client       : interaction.client,
        include_live : include_live,
        platform     : platform,
      })

      await interaction.respond(
        suggestions.map((suggestion) => ({
          name  : suggestion.name,
          value : suggestion.value,
        }))
      )
    } catch (error) {
      await log_error(interaction.client, error as Error, "notify_autocomplete", {
        subcommand : subcommand,
        user_id    : interaction.user.id,
        query      : focused_value,
      })
      await interaction.respond([])
    }
  },
}
