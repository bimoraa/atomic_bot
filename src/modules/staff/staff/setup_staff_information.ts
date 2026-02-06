import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  TextChannel,
} from "discord.js"
import { Command }  from "../../../shared/types/command"
import { is_admin } from "../../../shared/database/settings/permissions"
import { log_error } from "../../../shared/utils/error_logger"
import { get_all_staff_info_documents, file_name_to_custom_id } from "../../../shared/utils/staff_info_parser"
import {
  container,
  text,
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

      // - GET ALL STAFF INFO DOCUMENTS - \\
      const documents = await get_all_staff_info_documents("id")

      if (documents.length === 0) {
        await interaction.editReply({
          content: "No staff information documents found.",
        })
        return
      }

      // - GROUP DOCUMENTS BY SECTION - \\
      const sections: Record<string, typeof documents> = {}
      documents.forEach(doc => {
        if (!sections[doc.metadata.section]) {
          sections[doc.metadata.section] = []
        }
        sections[doc.metadata.section].push(doc)
      })

      // - BUILD COMPONENTS - \\
      const main_components: any[] = [
        container({
          components: [
            text("## INFORMASI STAFF\n\nPusat informasi resmi untuk seluruh Staff.\nGunakan menu di bawah ini untuk mengakses aturan, panduan, dan prosedur penting.")
          ]
        })
      ]

      // - SECTION 1 - RULES - \\
      if (sections.rules && sections.rules.length > 0) {
        const rule_buttons = sections.rules.map(doc => 
          secondary_button(doc.metadata.title, file_name_to_custom_id(doc.file_name))
        )
        
        main_components.push(
          container({
            components: [
              text("### SECTION 1 - Rules ( - Peraturan - )"),
              {
                type: 1,
                components: rule_buttons.slice(0, 5)
              }
            ]
          })
        )
      }

      // - SECTION 2 - GUIDE - \\
      if (sections.guide && sections.guide.length > 0) {
        const guide_buttons = sections.guide.map(doc => 
          secondary_button(doc.metadata.title, file_name_to_custom_id(doc.file_name))
        )
        
        main_components.push(
          container({
            components: [
              text("### SECTION 2 - Guide ( - Arahan - )"),
              {
                type: 1,
                components: guide_buttons.slice(0, 5)
              }
            ]
          })
        )
      }

      const message_payload = {
        flags: 32768,
        components: main_components,
      }

      await channel.send(message_payload as any)

      await interaction.editReply({
        content: `Staff information panel sent to ${channel} with ${documents.length} documents.`,
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
