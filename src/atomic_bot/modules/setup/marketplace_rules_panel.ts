import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  GuildMember,
} from "discord.js"
import { Command } from "@shared/types/command"
import { is_admin } from "@shared/database/settings/permissions"
import { component, api } from "@shared/utils"

/**
 * @description Build marketplace rules message
 * @returns {object} - Message payload
 */
function build_marketplace_rules_message() {
  return component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content  : "## Rules Marketplace\nMarketplace ini tempat jual-beli antar member. Semua transaksi dilakukan atas kesepakatan masing-masing pihak. Dengan mulai transaksi di sini, artinya lu SETUJU sama semua rules di bawah ini.",
            accessory: component.thumbnail("https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_logo.png?raw=true"),
          }),
        ],
      }),
      component.container({
        components: [
          component.text("### 1. SCAM = AUTO BAN\nScam itu termasuk: nipu, bukti transfer palsu, janji kosong, ngilang setelah dibayar, atau muter cerita biar duit/barang didapet."),
          component.divider(2),
          component.text("> *Sekali ketauan scam → **BAN PERMANEN**, gak ada klarifikasi, gak ada debat.*"),
        ],
      }),
      component.container({
        components: [
          component.text("### 2. JUALAN WAJIB JELAS\nSetiap penjual WAJIB nulis informasi berikut di awal postingan:\n- harga fix (atau tulis nego kalo bisa nego)\n- barang/jasa yang dijual secara rinci\n- apa saja yang pembeli TERIMA\n- batasan atau ketentuan (kalo ada)\n"),
          component.divider(),
          component.text("*Postingan yang kurang info, bikin bingung, atau sengaja disamarin berhak dihapus admin tanpa peringatan.*"),
        ],
      }),
      component.container({
        components: [
          component.text("### 3. DEAL ITU SERIUS\nKalo udah bilang \"deal\", berarti transaksi lanjut.\nGak boleh cancel sepihak kecuali ada alasan jelas."),
          component.divider(),
          component.text("*Ghosting setelah deal = pelanggaran*"),
        ],
      }),
      component.container({
        components: [
          component.text("### 4. PEMBAYARAN\nPembayaran cuma boleh dilakukan SETELAH semua detail jelas & disepakati dua pihak."),
          component.divider(),
          component.text("*Bukti transfer harus ASLI*\n*Bukti editan = dianggap scam*"),
        ],
      }),
      component.container({
        components: [
          component.text("### 5. MIDDLEMEN (OPSIONAL TAPI DISARANKAN)\nMiddleman dipake buat ngejaga transaksi biar aman, terutama nominal besar."),
          component.divider(),
          component.text("*Fee ngikut nominal*\n*Middleman cuma perantara, bukan penjamin kualitas*"),
        ],
      }),
      component.container({
        components: [
          component.text("### 6. SIMPAN BUKTI\nSemua chat & bukti transaksi WAJIB disimpan kalo ada masalah di kemudian hari."),
        ],
      }),
      component.container({
        components: [
          component.text("### 7. JANGAN RIBUT\nMarketplace bukan tempat drama."),
          component.divider(),
          component.text("*Spam, maksa, ngata-ngatain, atau ngegas = bisa kena mute/kick*"),
        ],
      }),
      component.container({
        components: [
          component.text("### 8. DILARANG NYEROBOT\nDilarang masuk DM buyer/seller orang lain buat nyolong transaksi."),
        ],
      }),
      component.container({
        components: [
          component.text("### 9. CHANNEL SESUAI FUNGSI\nPosting cuma di channel marketplace. Salah channel = dihapus."),
        ],
      }),
      component.container({
        components: [
          component.text("### 10. JASA TERLARANG\nJasa redeem, joki, atau layanan terlarang lainnya **DILARANG TOTAL**."),
        ],
      }),
      component.container({
        components: [
          component.text("### 11. RISIKO DITANGGUNG SENDIRI\nTransaksi tanpa middleman atau di luar rules = risiko bukan tanggung jawab admin."),
        ],
      }),
      component.container({
        components: [
          component.text("### 12. KEPUTUSAN ADMIN FINAL\nAdmin bebas hapus post, mute, kick, atau ban kapan aja kalo rules dilanggar."),
        ],
      }),
    ],
  })
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-marketplace-rules")
    .setDescription("Setup marketplace rules panel")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel where the marketplace rules will be sent")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content  : "You don't have permission to use this command.",
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const channel = interaction.options.getChannel("channel", true) as TextChannel

    if (!channel.isTextBased()) {
      await interaction.editReply({ content: "Please select a valid text channel." })
      return
    }

    const token   = api.get_token()
    const message = build_marketplace_rules_message()

    const response = await api.send_components_v2(channel.id, token, message)

    if (response.error) {
      await interaction.editReply({ content: "Failed to send marketplace rules panel." })
      console.error("[ - SETUP MARKETPLACE RULES - ] Error:", response)
      return
    }

    await interaction.editReply({
      content: `Marketplace rules panel has been sent to ${channel}`,
    })
  },
}
