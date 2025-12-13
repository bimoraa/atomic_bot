import { ButtonInteraction, GuildMember } from "discord.js"
import * as luarmor                     from "../../../functions/luarmor"
import { component, api, env, format } from "../../../utils"

const __script_role_id = env.get("LUARMOR_SCRIPT_ROLE_ID", "1398313779380617459")

export async function handle_get_role(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const member = interaction.member as GuildMember
  const guild  = interaction.guild!

  const user_result = await luarmor.get_user_by_discord(member.id)

  if (!user_result.success || !user_result.data) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## No Key Found`,
                `You don't have a key linked to your Discord account.`,
                ``,
                `Please use the **Redeem Key** button first to link your key.`,
              ],
              thumbnail: format.logo_url,
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
    return
  }

  const role = guild.roles.cache.get(__script_role_id)
  if (!role) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Role Not Found`,
                `The script role could not be found. Please contact an administrator.`,
              ],
              thumbnail: format.logo_url,
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
    return
  }

  if (member.roles.cache.has(__script_role_id)) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Already Have Role`,
                `You already have the <@&${__script_role_id}> role!`,
              ],
              thumbnail: format.logo_url,
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
    return
  }

  try {
    await member.roles.add(role)

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Role Added`,
                `You have been given the <@&${__script_role_id}> role!`,
                ``,
                `You now have access to script-related channels.`,
              ],
              thumbnail: format.logo_url,
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
  } catch (error) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Failed to Add Role`,
                `Could not add the role. Please contact an administrator.`,
              ],
              thumbnail: format.logo_url,
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
  }
}
