import { ModalSubmitInteraction } from "discord.js"
import { api, component }          from "../../../shared/utils"
import { log_error }               from "../../../shared/utils/error_logger"
import * as share_settings         from "../shared/controller/share_settings_controller"

/**
 * - HANDLE SHARE SETTINGS MODAL - \\
 * @param {ModalSubmitInteraction} interaction - Modal submit interaction
 * @returns {Promise<boolean>} Handled
 */
export async function handle_share_settings_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("share_settings_modal:") && !interaction.customId.startsWith("share_settings_edit:")) {
    return false
  }

  const parts = interaction.customId.split(":")
  const token = parts[1]
  if (!token) return false

  const entry = share_settings.get_pending_entry(token)
  if (!entry) {
    await interaction.reply({ content: "Request expired", ephemeral: true })
    return true
  }

  if (entry.user_id !== interaction.user.id) {
    await interaction.reply({ content: "You are not allowed to submit this modal", ephemeral: true })
    return true
  }

  if (!share_settings.can_use_share_settings(interaction.member as any)) {
    await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true })
    return true
  }

  await interaction.deferReply({ ephemeral: true })

  try {
    const note_value = interaction.fields.getTextInputValue("note")
    const payload = {
      ...entry.payload,
      note : note_value,
    }

    if (entry.action === "create") {
      const record = await share_settings.create_settings_record(interaction.client, payload as share_settings.share_settings_input)

      if (!record) {
        await api.edit_deferred_reply(interaction, component.build_message({
          components : [
            component.container({
              components : [
                component.text("Failed to create settings record"),
              ],
            }),
          ],
        }))
        share_settings.remove_pending_entry(token)
        return true
      }

      const search_token = share_settings.create_search_token([record], {}, record.settings_id)
      const message_payload = share_settings.build_search_message({
        token   : search_token,
        records : [record],
        index   : 0,
      })

      const channel_id = share_settings.get_settings_channel_id()
      const result = await api.send_components_v2(channel_id, api.get_token(), message_payload)

      if (result.error || !result.id) {
        await log_error(interaction.client, new Error("Failed to post settings"), "share_settings_post", {
          channel_id : channel_id,
          response   : result,
        })
      } else {
        await share_settings.update_settings_record(interaction.client, record.settings_id, {
          message_id : String(result.id),
          channel_id : channel_id,
        })
      }

      await api.edit_deferred_reply(interaction, component.build_message({
        components : [
          component.container({
            components : [
              component.text("Settings shared to community channel"),
            ],
          }),
        ],
      }))
      share_settings.remove_pending_entry(token)
      return true
    }

    if (entry.action === "edit" && entry.settings_id) {
      const updated = await share_settings.update_settings_record(interaction.client, entry.settings_id, payload)

      if (!updated) {
        await api.edit_deferred_reply(interaction, component.build_message({
          components : [
            component.container({
              components : [
                component.text("Failed to update settings"),
              ],
            }),
          ],
        }))
        share_settings.remove_pending_entry(token)
        return true
      }

      if (updated.channel_id && updated.message_id) {
        const search_token = share_settings.create_search_token([updated], {}, updated.settings_id)
        const message_payload = share_settings.build_search_message({
          token   : search_token,
          records : [updated],
          index   : 0,
        })
        await api.edit_components_v2(updated.channel_id, updated.message_id, api.get_token(), message_payload)
      }

      await api.edit_deferred_reply(interaction, component.build_message({
        components : [
          component.container({
            components : [
              component.text("Settings updated"),
            ],
          }),
        ],
      }))
      share_settings.remove_pending_entry(token)
      return true
    }

    share_settings.remove_pending_entry(token)
    await api.edit_deferred_reply(interaction, component.build_message({
      components : [
        component.container({
          components : [
            component.text("Invalid request"),
          ],
        }),
      ],
    }))
    return true
  } catch (error) {
    await log_error(interaction.client, error as Error, "share_settings_modal", {
      custom_id : interaction.customId,
    })
    await api.edit_deferred_reply(interaction, component.build_message({
      components : [
        component.container({
          components : [
            component.text("Failed to process settings"),
          ],
        }),
      ],
    }))
    return true
  }
}
