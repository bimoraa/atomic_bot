import { ButtonInteraction, ThreadChannel, TextChannel } from "discord.js"
import {
  close_ticket,
  get_ticket,
  get_ticket_config,
} from "../../../../shared/database/unified_ticket"
import {
  complete_middleman_ticket,
  get_middleman_ticket,
} from "../../../../shared/database/managers/middleman_manager"
import { component, time, api, db } from "../../../../shared/utils"
import { log_error } from "../../../../shared/utils/error_logger"

interface TransactionRange {
  label : string
  range : string
  fee   : string
}

const TRANSACTION_RANGES: Record<string, TransactionRange> = {
  "dVzaCndYpO": { label: "Rp 10.000 – Rp 50.000",   range: "Rp 10.000 – Rp 50.000",   fee: "Rp 1.500" },
  "laf8By4Gtm": { label: "Rp 50.000 – Rp 100.000",  range: "Rp 50.000 – Rp 100.000",  fee: "Rp 5.000" },
  "1FS1PRT0Ys": { label: "Rp 100.000 – Rp 200.000", range: "Rp 100.000 – Rp 200.000", fee: "Rp 8.000" },
  "WnGoXX4HnQ": { label: "Rp 200.000 – Rp 300.000", range: "Rp 200.000 – Rp 300.000", fee: "Rp 12.000" },
  "PIMLKDohan": { label: "≥ Rp 300.000",            range: "≥ Rp 300.000",            fee: "5% dari total transaksi" },
}

/**
 * @description Marks middleman ticket as complete and closes it
 * @param {ButtonInteraction} interaction - The button interaction
 * @returns {Promise<boolean>} - Returns true if handled
 */
export async function handle_middleman_complete(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_complete:")) return false

  const mm_config        = get_ticket_config("middleman")
  const authorized_users = mm_config?.authorized_users || []

  if (!authorized_users.includes(interaction.user.id)) {
    await interaction.reply({
      content  : "You don't have permission to use this button.",
      ephemeral: true,
    })
    return true
  }

  const thread = interaction.channel as ThreadChannel

  if (!thread.isThread()) {
    await interaction.reply({
      content  : "This can only be used in a ticket thread.",
      ephemeral: true,
    })
    return true
  }

  await interaction.deferReply({ ephemeral: true })

  const ticket_data = get_ticket(thread.id)
  const config      = get_ticket_config("middleman")
  const db_ticket   = await get_middleman_ticket(thread.id)

  if (ticket_data && config) {
    const range_data    = TRANSACTION_RANGES[ticket_data.issue_type || ""]
    const partner_match = ticket_data.description?.match(/Partner: <@(\d+)>/)
    const partner_id    = partner_match ? partner_match[1] : "unknown"
    const partner_tag   = partner_id !== "unknown" ? `<@${partner_id}>` : "Unknown"
    const timestamp     = time.now()
    const token         = api.get_token()

    if (db.is_connected() && range_data) {
      try {
        // - SAVE TRANSACTION TO DATABASE - \\
        await db.insert_one("middleman_transactions", {
          ticket_id        : ticket_data.ticket_id,
          requester_id     : ticket_data.owner_id,
          partner_id       : partner_id,
          partner_tag      : partner_tag,
          transaction_range: range_data.range,
          fee              : range_data.fee,
          range_id         : ticket_data.issue_type || "",
          completed_by     : interaction.user.id,
          completed_at     : timestamp,
          thread_id        : thread.id,
          guild_id         : interaction.guildId || "",
        })
        
        // - MARK TICKET AS COMPLETED IN DATABASE - \\
        await complete_middleman_ticket(thread.id, interaction.user.id)
        
        console.log(`[ - MIDDLEMAN - ] Transaction saved to database: ${ticket_data.ticket_id}`)
      } catch (error) {
        console.error(`[ - MIDDLEMAN - ] Failed to save transaction:`, error)
        await log_error(interaction.client, error as Error, "Middleman Complete - DB Save", {
          ticket_id: ticket_data.ticket_id,
          user_id  : interaction.user.id,
        })
      }
    }

    const complete_channel_id = config.complete_channel_id || config.log_channel_id
    const log_channel         = interaction.client.channels.cache.get(complete_channel_id) as TextChannel
    if (log_channel && range_data) {
      const log_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("## Transaksi Berhasil"),
              component.divider(2),
              component.text([
                `**Detail Transaksi:**`,
                `- <:USERS:1381580388119613511> Pihak 1: <@${ticket_data.owner_id}>`,
                `- <:USERS:1381580388119613511> Pihak 2: ${partner_tag}`,
                `- <:calc:1381580377340117002> Rentang nominal: ${range_data.range}`,
                `- <:PIG:1381580596349767771> Fee middleman: ${range_data.fee}`,
                `- <:alarm:1381580370704601210> Tanggal transaksi: <t:${timestamp}:F>`,
              ]),
              component.divider(2),
              component.text("Terima kasih telah menggunakan layanan middleman kami."),
            ],
          }),
        ],
      })

      await api.send_components_v2(log_channel.id, token, log_message)
    }

    // - DELETE OPEN LOG MESSAGE IF EXISTS - \\
    if (db_ticket?.log_message_id) {
      const open_log_channel = interaction.client.channels.cache.get(config.log_channel_id) as TextChannel
      if (open_log_channel) {
        await api.delete_message(open_log_channel.id, db_ticket.log_message_id, token)
      }
    }
  }

  await close_ticket({
    thread,
    client   : interaction.client,
    closed_by: interaction.user,
    reason   : "Transaction completed successfully",
  })

  await interaction.editReply({ content: "✅ Transaction completed! Ticket closed." })
  return true
}
