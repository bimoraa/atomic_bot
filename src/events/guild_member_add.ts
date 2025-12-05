import { Events, GuildMember } from "discord.js";
import { client } from "..";
import { load_config } from "../configuration/loader";

const config = load_config<{ welcome_channel_id: string; rules_channel_id: string }>("welcomer");

client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    try {
        const channel = await member.guild.channels.fetch(config.welcome_channel_id);
        if (!channel || !channel.isTextBased()) return;

        const userAvatar = member.user.displayAvatarURL({ extension: "png", size: 256 });
        const serverIcon = member.guild.iconURL({ extension: "png", size: 256 }) || "https://cdn.discordapp.com/embed/avatars/0.png";

        await fetch(`https://discord.com/api/v10/channels/${config.welcome_channel_id}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bot ${client.token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                flags: 32768,
                components: [
                    {
                        type: 17,
                        components: [
                            {
                                type: 9,
                                components: [
                                    {
                                        type: 10,
                                        content: `## Welcome\n<@${member.user.id}>, you've just joined **${member.guild.name}**.\nWe're glad to have you here.`
                                    }
                                ],
                                accessory: {
                                    type: 11,
                                    media: {
                                        url: userAvatar
                                    }
                                }
                            },
                            {
                                type: 14,
                                spacing: 2
                            },
                            {
                                type: 9,
                                components: [
                                    {
                                        type: 10,
                                        content: `## Start Here\nBefore exploring, please read <#${config.rules_channel_id}> to understand how everything works.`
                                    }
                                ],
                                accessory: {
                                    type: 11,
                                    media: {
                                        url: serverIcon
                                    }
                                }
                            }
                        ],
                        spoiler: true
                    }
                ]
            })
        });

        console.log(`Welcome message sent for ${member.user.tag}`);
    } catch (error) {
        console.error("Error sending welcome message:", error);
    }
});
