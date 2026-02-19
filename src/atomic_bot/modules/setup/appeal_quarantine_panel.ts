import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
} from "discord.js"
import { Command }          from "@shared/types/command"
import { is_admin }         from "@shared/database/settings/permissions"
import { component, api }   from "@shared/utils"
import { get_ticket_config } from "@shared/database/unified_ticket"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("appeal_quarantine_panel")
    .setDescription("Send the appeal quarantine info panel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content : "You don't have permission to use this command.",
        flags   : 64,
      })
      return
    }

    await interaction.deferReply({ flags: 64 })

    const config = get_ticket_config("appeal_quarantine")
    if (!config) {
      await interaction.editReply({ content: "Appeal quarantine config not found." })
      return
    }

    let channel: TextChannel | null = null
    try {
      channel = await interaction.client.channels.fetch(config.panel_channel_id) as TextChannel
    } catch {
      channel = null
    }

    if (!channel) {
      await interaction.editReply({
        content: `Panel channel not found. ID: ${config.panel_channel_id}`,
      })
      return
    }

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              "## Hello, Quarantined Members",
              "Jika Anda melihat pesan ini, berarti Anda telah melanggar aturan atau menimbulkan keributan di dalam Atomic Hub."
            ]),
          ],
        }),
        component.container({
          components: [
            component.text([
              "## Hal-Hal yang Dapat Menyebabkan Anda Dikarantina",
              "",
              "1. Menimbulkan atau memicu drama, keributan, atau konflik di dalam Atomic Hub.",
              "2. Menyebarkan data pribadi member (termasuk staff) tanpa izin.",
              "3. Melakukan doxing, ancaman, pemerasan, atau intimidasi terhadap member maupun staff.",
              "4. Menggunakan kata-kata kasar berlebihan, pelecehan, ujaran kebencian, rasisme, atau diskriminasi dalam bentuk apa pun.",
              "5. Menyebarkan hoaks, fitnah, atau informasi palsu yang dapat merugikan individu atau komunitas.",
              "6. Melakukan spam, flood, atau promosi tanpa izin di channel mana pun.",
              "7. Menyalahgunakan bug, celah sistem, atau fitur server untuk kepentingan pribadi.",
              "8. Tidak mematuhi instruksi, peringatan, atau keputusan yang diberikan oleh staff.",
              "9. Meniru identitas staff, admin, atau pihak lain (impersonation).",
              "10. Membagikan konten ilegal, berbahaya, atau melanggar hukum.",
              "11. Mengganggu ketertiban server secara berulang meskipun telah diberikan peringatan.",
              "12. Menghasut member lain untuk melanggar rules atau melawan staff.",
              "13. Menggunakan alt account untuk menghindari hukuman atau sanksi.",
              "14. Membocorkan informasi internal server, staff, atau sistem tanpa izin.",
              "15. Melakukan tindakan yang dinilai merugikan reputasi dan keamanan Atomic Hub.",
              "16. Menggunakan Server Tag yang diblokir oleh Atomic Community.",
              "17. Memprovokasi staff atau member secara sengaja untuk memicu konflik.",
              "18. Menyalahgunakan laporan (false report) untuk menjatuhkan member atau staff lain.",
              "19. Mengabaikan atau meremehkan aturan server dengan alasan apa pun.",
              "20. Melakukan aktivitas mencurigakan yang berpotensi membahayakan keamanan server.",
            ]),
            component.divider(2),
            component.text([
              "## Cara Menghilangkan Quarantine",
              "",
              "- Ajukan banding dengan menekan tombol **\"Appeal\"**, lalu jelaskan secara jelas dan jujur mengenai situasi yang terjadi.",
              "- Hapus atau ganti Server Tag yang Anda gunakan jika Server Tag tersebut melanggar atau diblokir oleh Atomic Community.",
              "",
              "Tunggu proses peninjauan oleh staff dan patuhi seluruh aturan selama masa karantina.",
            ]),
          ],
        }),
        component.container({
          components: [
            component.section({
              content   : "Jika ini adalah kesalahan staff / sistem, Anda bisa appeal.",
              accessory : component.success_button("Appeal", "appeal_quarantine_open"),
            }),
          ],
        }),
      ],
    })

    const response = await api.send_components_v2(channel.id, api.get_token(), message)

    if (!response.error) {
      await interaction.editReply({ content: "Appeal quarantine panel sent successfully!" })
    } else {
      console.error("[ - APPEAL QUARANTINE PANEL - ] Error:", response)
      await interaction.editReply({ content: "Failed to send appeal quarantine panel." })
    }
  },
}
