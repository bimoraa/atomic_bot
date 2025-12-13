import { ModalSubmitInteraction, GuildMember } from "discord.js"
import * as luarmor                    from "../../functions/luarmor"
import { component, api, env, format } from "../../utils"

const __script_role_id = env.get("LUARMOR_SCRIPT_ROLE_ID", "1398313779380617459")

export async function handle_script_redeem_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (interaction.customId !== "script_redeem_modal") return false

  await interaction.deferReply({ ephemeral: true })

  const member   = interaction.member as GuildMember
  const user_key = interaction.fields.getTextInputValue("user_key").trim()

  const verify_result = await luarmor.get_user_by_key(user_key)

  if (!verify_result.success || !verify_result.data) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Invalid Key`,
                `The key you entered is invalid or does not exist.`,
                ``,
                `Please check your key and try again.`,
              ],
              thumbnail: format.logo_url,
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
    return true
  }

  const existing_user = verify_result.data

  if (existing_user.discord_id && existing_user.discord_id !== member.id) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Key Already Linked`,
                `This key is already linked to another Discord account.`,
                ``,
                `If you believe this is an error, please contact support.`,
              ],
              thumbnail: format.logo_url,
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
    return true
  }

  if (!existing_user.discord_id || existing_user.discord_id !== member.id) {
    const link_result = await luarmor.link_discord(user_key, member.id)

    if (!link_result.success) {
      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## Failed to Link`,
                  `Could not link your Discord account to this key.`,
                  ``,
                  `**Reason:** ${link_result.error || "Unknown error"}`,
                ],
                thumbnail: format.logo_url,
              }),
            ],
          }),
        ],
      })

      await api.edit_deferred_reply(interaction, message)
      return true
    }
  }

  try {
    const guild = interaction.guild!
    const role  = guild.roles.cache.get(__script_role_id)
    if (role && !member.roles.cache.has(__script_role_id)) {
      await member.roles.add(role)
    }
  } catch {
  }

  const loader_script = luarmor.get_full_loader_script(user_key)

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Key Redeemed Successfully!`,
              `Your key has been linked to your Discord account.`,
              ``,
              `### Your Loader Script:`,
              `\`\`\`lua`,
              loader_script,
              `\`\`\``,
              ``,
              `-# Keep your key private! Do not share it with anyone.`,
            ],
            thumbnail: format.logo_url,
          }),
        ],
      }),
    ],
  })

  await api.edit_deferred_reply(interaction, message)
  return true
}
