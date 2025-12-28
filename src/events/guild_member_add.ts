import { Events, GuildMember }      from "discord.js"
import { client }                   from ".."
import { load_config }              from "../configuration/loader"
import { component, api, format }   from "../utils"

interface welcomer_config {
  welcome_channel_id: string
  rules_channel_id  : string
}

const config = load_config<welcomer_config>("welcomer")

client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
  try {
    const channel      = await member.guild.channels.fetch(config.welcome_channel_id)
    if (!channel || !channel.isTextBased()) return

    const user_avatar = member.user.displayAvatarURL({ extension: "png", size: 256 })
    const server_icon = member.guild.iconURL({ extension: "png", size: 256 }) || format.default_avatar

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content  : [
                `## Welcome`,
                `<@${member.user.id}>, you've just joined **${member.guild.name}**.`,
                `We're glad to have you here.`,
              ],
              thumbnail: user_avatar,
            }),
            component.divider(),
            component.section({
              content  : [
                `## Start Here`,
                `Before exploring, please read <#${config.rules_channel_id}> to understand how everything works.`,
              ],
              thumbnail: server_icon,
            }),
          ],
        }),
      ],
    })

    await api.send_components_v2(config.welcome_channel_id, api.get_token(), message)

    console.log(`[welcomer] Message sent for ${member.user.tag}`)
  } catch (error) {
    console.error("[welcomer] Error:", error)
  }
})
