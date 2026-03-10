/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 支付相关按钮组件的定义和构建 - \
// - button component definitions for payment - \
import { ButtonInteraction, GuildMember } from "discord.js"
import { ButtonHandler }                  from "@shared/types/interaction"
import { component, api, time }           from "@shared/utils"
import { is_staff }                       from "@shared/database/settings/permissions"
import { create_key_for_project, delete_user_from_project } from "@atomic/infrastructure/api/luarmor"
import { add_work_log }                   from "@shared/database/trackers/work_tracker"
import { log_error }                      from "@shared/utils/error_logger"

const __whitelist_project_id = "6958841b2d9e5e049a24a23e376e0d77"
const __payment_channel_id   = "1392574025498366061"
const __buyer_role_id        = "1398313779380617459"
const __sp_role_id           = "1364930933148352522"

export const button: ButtonHandler = {
  custom_id: /^payment_(approve|reject)_/,
  async execute(interaction: ButtonInteraction) {
    const member = interaction.member as GuildMember

    if (!is_staff(member)) {
      await interaction.reply({
        content  : "Only staff can use this button.",
        ephemeral: true,
      })
      return
    }

    await interaction.deferUpdate()

    const is_approve = interaction.customId.startsWith("payment_approve_")
    const parts      = interaction.customId.replace(/^payment_(approve|reject)_/, "").split("_")

    const staff_id   = parts[0] || ""
    const amount_val = parseInt(parts[1] || "0", 10)
    const customer_id = parts[2] || ""
    const channel_id  = parts[3] || ""

    const formatted_amount = `Rp ${new Intl.NumberFormat("id-ID").format(amount_val)}`

    if (is_approve) {
      try {
        await delete_user_from_project(__whitelist_project_id, customer_id)

        const whitelist_result = await create_key_for_project(__whitelist_project_id, {
          discord_id: customer_id,
          note      : `Manually approved by ${interaction.user.tag} at ${time.full_date_time(time.now())}`,
        })

        if (!whitelist_result.success || !whitelist_result.data?.user_key) {
          await interaction.followUp({
            content  : `Failed to whitelist customer: ${whitelist_result.error}`,
            ephemeral: true,
          })
          return
        }

        try {
          const customer_member = await interaction.guild?.members.fetch(customer_id)
          if (customer_member) {
            await customer_member.roles.add(__buyer_role_id)
            await customer_member.roles.add(__sp_role_id)
          }
        } catch (role_err) {
          await log_error(interaction.client, role_err as Error, "payment_approve_add_roles", { customer_id })
        }

        const message_link = `https://discord.com/channels/${interaction.guildId}/${__payment_channel_id}/${interaction.message.id}`
        await add_work_log(staff_id, staff_id, "ticket", message_link, undefined, amount_val)

        const approved_message = component.build_message({
          components: [
            component.container({
              accent_color: 0x57F287,
              components: [
                component.text([
                  "## ✅ Payment Approved",
                  `- Customer: <@${customer_id}>`,
                  `- Amount: **${formatted_amount}**`,
                  `- Approved by: <@${interaction.user.id}>`,
                  `- Submitted by: <@${staff_id}>`,
                ]),
              ],
            }),
          ],
        })

        await api.edit_components_v2(
          __payment_channel_id,
          interaction.message.id,
          api.get_token(),
          approved_message
        )

        if (channel_id) {
          const notify = component.build_message({
            components: [
              component.container({
                components: [
                  component.text([
                    "## Payment Approved ✅",
                    "Your payment has been approved and you have been whitelisted!",
                  ]),
                ],
              }),
            ],
          })
          await api.send_components_v2(channel_id, api.get_token(), notify).catch(() => {})
        }

        try {
          const customer = await interaction.client.users.fetch(customer_id)
          const dm = await customer.createDM()
          const dm_msg = component.build_message({
            components: [
              component.container({
                components: [
                  component.text([
                    "## Payment Approved ✅",
                    "Your payment has been approved and you have been whitelisted!",
                  ]),
                ],
              }),
            ],
          })
          await api.send_components_v2(dm.id, api.get_token(), dm_msg).catch(() => {})
        } catch {}
      } catch (err) {
        await log_error(interaction.client, err as Error, "payment_approve_button", {
          customer_id,
          approver: interaction.user.id,
        })
        await interaction.followUp({
          content  : "An error occurred while approving the payment. Please try again.",
          ephemeral: true,
        })
      }
    } else {
      const rejected_message = component.build_message({
        components: [
          component.container({
            accent_color: 0xED4245,
            components: [
              component.text([
                "## ❌ Payment Rejected",
                `- Customer: <@${customer_id}>`,
                `- Amount: **${formatted_amount}**`,
                `- Rejected by: <@${interaction.user.id}>`,
              ]),
            ],
          }),
        ],
      })

      await api.edit_components_v2(
        __payment_channel_id,
        interaction.message.id,
        api.get_token(),
        rejected_message
      )

      if (channel_id) {
        const notify = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## Payment Rejected ❌",
                  "Your payment has been rejected. Please contact staff for more information.",
                ]),
              ],
            }),
          ],
        })
        await api.send_components_v2(channel_id, api.get_token(), notify).catch(() => {})
      }
    }
  },
}
