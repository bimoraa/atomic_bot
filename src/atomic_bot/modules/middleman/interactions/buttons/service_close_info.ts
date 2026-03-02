import { ButtonInteraction } from "discord.js"
import { api, component } from "@shared/utils"

/**
 * Handle button click for middleman service close info
 *
 * @param {ButtonInteraction} interaction - Button interaction
 * @returns {Promise<void>}
 */
export async function handle_middleman_service_close_info(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ flags: 64 })

  const info_message = component.build_message({
    components: [
      component.container({
        components: [
          component.text(
            "Untuk saat ini, layanan Midman sedang ditutup sementara.\n" +
            "Penutupan ini bersifat sementara dan dilakukan demi keamanan serta kelancaran transaksi ke depannya.\n\n" +
            "**Selama status ini berlaku:**\n" +
            "- Midman tidak menerima transaksi apa pun\n" +
            "- Segala bentuk transaksi yang mengatasnamakan midman di luar tanggung jawab kami\n" +
            "- Mohon menunggu pengumuman resmi untuk info pembukaan kembali\n\n" +
            "Update selanjutnya akan disampaikan melalui channel ini.\n" +
            "Terima kasih atas perhatian dan pengertiannya 🙏"
          ),
        ],
      }),
    ],
  })

  await api.edit_deferred_reply(interaction, info_message)
}
