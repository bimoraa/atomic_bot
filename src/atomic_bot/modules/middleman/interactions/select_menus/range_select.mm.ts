// - 中间人流程里选择交易范围的菜单交互 - \
// - range select menu interaction for the middleman flow - \
import { StringSelectMenuInteraction } from "discord.js"
import { component }                   from "@shared/utils"
import { is_middleman_service_open }   from "@shared/database/managers/middleman_service_manager"

interface TransactionRange {
  id    : string
  label : string
  range : string
  fee   : string
}

const __transaction_ranges: Record<string, TransactionRange> = {
  "dVzaCndYpO": { id: "dVzaCndYpO", label: "Rp 10.000 – Rp 50.000",   range: "Rp 10.000 – Rp 50.000",   fee: "Rp 1.500" },
  "laf8By4Gtm": { id: "laf8By4Gtm", label: "Rp 51.000 – Rp 100.000",  range: "Rp 51.000 – Rp 100.000",  fee: "Rp 5.000" },
  "1FS1PRT0Ys": { id: "1FS1PRT0Ys", label: "Rp 101.000 – Rp 200.000", range: "Rp 101.000 – Rp 200.000", fee: "Rp 8.000" },
  "WnGoXX4HnQ": { id: "WnGoXX4HnQ", label: "Rp 201.000 – Rp 300.000", range: "Rp 201.000 – Rp 300.000", fee: "Rp 12.000" },
  "PIMLKDohan": { id: "PIMLKDohan", label: "≥ Rp 300.000",            range: "≥ Rp 300.000",            fee: "5% dari total transaksi" },
}

/**
 * @description Handles transaction range selection — shows seller user-select next
 * @param {StringSelectMenuInteraction} interaction - The select menu interaction
 * @returns {Promise<void>}
 */
export async function handle_middleman_transaction_range_select(interaction: StringSelectMenuInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const is_open = await is_middleman_service_open(interaction.guildId || "")
  if (!is_open) {
    await interaction.editReply(component.build_message({
      components: [
        component.container({
          components  : [component.text("## Middleman Service is Closed")],
          accent_color: 15277667,
        }),
        component.container({
          components: [
            component.text(
              "Layanan Midman sedang ditutup sementara.\n\n" +
              "Mohon tunggu pengumuman resmi mengenai pembukaan kembali layanan.\n" +
              "Segala bentuk transaksi yang mengatasnamakan midman di luar tanggung jawab kami."
            ),
          ],
        }),
      ],
    }))
    return
  }

  const selected_value = interaction.values[0]
  const range_data     = __transaction_ranges[selected_value]

  if (!range_data) {
    await interaction.editReply({ content: "Invalid transaction range selected." })
    return
  }

  await interaction.editReply(component.build_message({
    components: [
      component.container({
        components: [
          component.text("## Pilih Penjual"),
          component.divider(2),
          component.text([
            "Detail transaksi:",
            `- Rentang transaksi: ${range_data.range}`,
            `- Fee Rekber: ${range_data.fee}`,
            "",
            "Silakan pilih siapa yang menjadi Penjual dalam transaksi ini.",
          ]),
          {
            type: 1,
            components: [
              {
                type       : 5,
                custom_id  : `middleman_penjual_select:${selected_value}`,
                placeholder: "Pilih Penjual",
                min_values : 1,
                max_values : 1,
              },
            ],
          },
        ],
      }),
    ],
  }))
}
