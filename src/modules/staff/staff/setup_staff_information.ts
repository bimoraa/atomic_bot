import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  TextChannel,
} from "discord.js"
import { Command }  from "../../../shared/types/command"
import { is_admin } from "../../../shared/database/settings/permissions"
import { log_error } from "../../../shared/utils/error_logger"
import {
  container,
  text,
  action_row,
  secondary_button,
} from "../../../shared/utils/components"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-staff-information")
    .setDescription("Setup staff information panel")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to send staff information")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember

    if (!is_admin(member)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      })
      return
    }

    try {
      const channel = interaction.options.getChannel("channel", true)
      
      if (!(channel instanceof TextChannel)) {
        await interaction.reply({
          content: "Please select a text channel.",
          ephemeral: true,
        })
        return
      }

      await interaction.deferReply({ ephemeral: true })

      const message_payload = {
        flags: 32768,
        components: [
          container({
            components: [
              text("## INFORMASI STAFF\n\nPusat informasi resmi untuk seluruh Staff.\nGunakan menu di bawah ini untuk mengakses aturan, panduan, dan prosedur penting.")
            ]
          }),
          container({
            components: [
              text("### SECTION 1 - Rules ( - Peraturan - )"),
              {
                type: 1,
                components: [
                  secondary_button("Communication Rules", "staff_info_communication_rules"),
                  secondary_button("Staff Rules", "staff_info_staff_rules")
                ]
              }
            ]
          }),
          container({
            components: [
              text("### SECTION 2 - Guide ( - Arahan - )"),
              {
                type: 1,
                components: [
                  secondary_button("Purchase Ticket Guide", "staff_info_purchase_ticket"),
                  secondary_button("Priority Support Guide", "staff_info_priority_support"),
                  secondary_button("Ask Staff Guide (Handling Questions)", "staff_info_ask_staff")
                ]
              }
            ]
          }),
        ],
      }

      await channel.send(message_payload as any)

      await interaction.editReply({
        content: `Staff information panel sent to ${channel}`,
      })
    } catch (err) {
      console.log("[ - SETUP STAFF INFO - ] Error:", err)
      await log_error(interaction.client, err as Error, "Setup Staff Information", {
        user   : interaction.user.tag,
        guild  : interaction.guild?.name || "DM",
        channel: interaction.channel?.id,
      })

      if (interaction.deferred) {
        await interaction.editReply({
          content: "Error setting up staff information panel.",
        })
      } else {
        await interaction.reply({
          content: "Error setting up staff information panel.",
          ephemeral: true,
        })
      }
    }
  },
}
