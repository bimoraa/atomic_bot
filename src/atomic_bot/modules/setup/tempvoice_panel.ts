import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
  ChannelType,
  PermissionFlagsBits,
}                               from "discord.js"
import { Command }              from "@shared/types/command"
import { is_admin }             from "@shared/database/settings/permissions"
import { api, component }       from "@shared/utils"
import * as tempvoice           from "@shared/database/services/tempvoice"

const interface_image = "https://github.com/bimoraa/atomic_bot/blob/main/assets/interface.png?raw=true"

const emoji = {
  name         : { id: "1449851618295283763", name: "name"         },
  limit        : { id: "1449851533033214063", name: "limit"        },
  privacy      : { id: "1449851430637797616", name: "privacy"      },
  waiting_room : { id: "1449851292896858132", name: "waiting_room" },
  chat         : { id: "1449851153289576519", name: "chat"         },
  trust        : { id: "1449851587152449746", name: "trust"        },
  untrust      : { id: "1449851506550509730", name: "untrust"      },
  invite       : { id: "1449851345405218997", name: "invite"       },
  kick         : { id: "1449851225427148860", name: "kick"         },
  region       : { id: "1449851128295456918", name: "region"       },
  block        : { id: "1449851559591809104", name: "block"        },
  unblock      : { id: "1449851467304534017", name: "unblock"      },
  claim        : { id: "1449851319350333613", name: "claim"        },
  transfer     : { id: "1449851186772578315", name: "transfer"     },
  delete       : { id: "1449851060922355824", name: "delete"       },
  leaderboard  : { id: "1457012485281546260", name: "leaderboard"  },
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("tempvoice_panel")
    .setDescription("Setup TempVoice system and send the control panel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember
    const guild  = interaction.guild!

    if (!is_admin(member)) {
      await interaction.reply({
        content   : "You don't have permission to use this command.",
        ephemeral : true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const setup_result = await tempvoice.setup_tempvoice(guild)

    if (!setup_result.success) {
      await interaction.editReply({
        content: `Failed to setup TempVoice: ${setup_result.error}`,
      })
      return
    }

    if (!setup_result.interface_channel_id) {
      await interaction.editReply({
        content: "Failed to create interface channel.",
      })
      return
    }

    const message_payload = component.build_message({
      components: [
        component.container({
          components: [
            component.text("## Atomic TempVoice\nThis interface can be used to manage temporary voice channels."),
            component.divider(2),
            component.media_gallery([
              component.gallery_item(interface_image),
            ]),
            component.divider(2),
            component.action_row(
              component.secondary_button("", "tempvoice_name",        emoji.name),
              component.secondary_button("", "tempvoice_limit",       emoji.limit),
              component.secondary_button("", "tempvoice_privacy",     emoji.privacy),
              component.secondary_button("", "tempvoice_waitingroom", emoji.waiting_room),
              component.secondary_button("", "tempvoice_chat",        emoji.chat),
            ),
            component.action_row(
              component.secondary_button("", "tempvoice_trust",   emoji.trust),
              component.secondary_button("", "tempvoice_untrust", emoji.untrust),
              component.secondary_button("", "tempvoice_invite",  emoji.invite),
              component.secondary_button("", "tempvoice_kick",    emoji.kick),
              component.secondary_button("", "tempvoice_region",  emoji.region),
            ),
            component.action_row(
              component.secondary_button("", "tempvoice_block",       emoji.block),
              component.secondary_button("", "tempvoice_unblock",     emoji.unblock),
              component.secondary_button("", "tempvoice_claim",       emoji.claim),
              component.secondary_button("", "tempvoice_transfer",    emoji.transfer),
              component.secondary_button("", "tempvoice_delete", emoji.delete),
            ),
            component.action_row(
              component.secondary_button("", "tempvoice_leaderboard", emoji.leaderboard)
            ),
          ],
        }),
      ],
    })

    const message_id = "1449869335479718139"

    const response = await api.edit_components_v2(
      setup_result.interface_channel_id!,
      message_id,
      api.get_token(),
      message_payload
    )

    if (!response.error) {
      await interaction.editReply({
        content: `TempVoice setup complete!\n\n**Category:** ${setup_result.category_name}\n**Interface Channel:** <#${setup_result.interface_channel_id}>\n**Generator Channel:** ${setup_result.generator_name}`,
      })
    } else {
      console.error("[tempvoice_panel] Error:", response)
      await interaction.editReply({
        content: "Failed to send TempVoice panel.",
      })
    }
  },
}
