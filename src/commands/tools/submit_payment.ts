import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember, TextChannel, ThreadChannel } from "discord.js"
import { Command } from "../../types/command"
import { is_staff } from "../../functions/permissions"
import { api, time, component } from "../../utils"
import { load_config } from "../../configuration/loader"

const payment_cfg = load_config<{ submit_channel_id: string }>("payment")
const payment_channel_id = payment_cfg.submit_channel_id
const ALLOWED_PARENT_CHANNEL = "1250446131993903114"

function parse_amount(input: string): number {
  const cleaned = input.replace(/[^\d]/g, "")
  return parseInt(cleaned, 10) || 0
}

function format_amount(amount: number, currency: string): string {
  if (currency === "USD") {
    return `$${new Intl.NumberFormat("en-US").format(amount)}`
  }
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("submit-payment")
    .setDescription("Submit a payment for approval")
    .addStringOption(opt =>
      opt.setName("amount")
        .setDescription("Amount (e.g. Rp.19.999, 19.999, 19999, $50)")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("currency")
        .setDescription("Currency type")
        .setRequired(true)
        .addChoices(
          { name: "IDR (Rupiah)", value: "IDR" },
          { name: "USD (Dollar)", value: "USD" },
        )
    )
    .addUserOption(opt =>
      opt.setName("customer")
        .setDescription("Customer Discord")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("method")
        .setDescription("Payment method")
        .setRequired(true)
        .addChoices(
          { name: "Bank Jago",  value: "Bank Jago" },
          { name: "BCA",        value: "BCA" },
          { name: "BRI",        value: "BRI" },
          { name: "BNI",        value: "BNI" },
          { name: "Mandiri",    value: "Mandiri" },
          { name: "Dana",       value: "Dana" },
          { name: "OVO",        value: "OVO" },
          { name: "GoPay",      value: "GoPay" },
          { name: "ShopeePay",  value: "ShopeePay" },
          { name: "QRIS",       value: "QRIS" },
          { name: "PayPal",     value: "PayPal" },
          { name: "Other",      value: "Other" },
        )
    )
    .addStringOption(opt =>
      opt.setName("details")
        .setDescription("Transaction details")
        .setRequired(true)
    )
    .addAttachmentOption(opt =>
      opt.setName("proof1")
        .setDescription("Payment proof 1 (image)")
        .setRequired(true)
    )
    .addAttachmentOption(opt =>
      opt.setName("proof2")
        .setDescription("Payment proof 2 (image) - optional")
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const member = interaction.member as GuildMember
      const current_channel = interaction.channel

      const is_valid_thread = current_channel?.isThread() && 
        (current_channel as ThreadChannel).parentId === ALLOWED_PARENT_CHANNEL

      if (!is_valid_thread) {
        await interaction.reply({
          content: `This command can only be used in threads under <#${ALLOWED_PARENT_CHANNEL}>`,
          flags: 64,
        })
        return
      }

      if (!is_staff(member)) {
        await interaction.reply({
          content: "Only staff can submit payments.",
          flags: 64,
        })
        return
      }

      await interaction.deferReply({ flags: 64 })

      const amount_input     = interaction.options.getString("amount", true)
      const currency         = interaction.options.getString("currency", true)
      const customer         = interaction.options.getUser("customer", true)
      const method           = interaction.options.getString("method", true)
      const details          = interaction.options.getString("details", true)
      const proof1           = interaction.options.getAttachment("proof1", true)
      const proof2           = interaction.options.getAttachment("proof2")
      const amount           = parse_amount(amount_input)
      const formatted_amount = format_amount(amount, currency)
      const timestamp        = time.now()

      if (amount <= 0) {
        await interaction.editReply({ content: "Invalid amount. Please enter a valid number." })
        return
      }

      const gallery_items: component.gallery_item[] = [
        component.gallery_item(proof1.url, "Proof 1"),
      ]

      if (proof2) {
        gallery_items.push(component.gallery_item(proof2.url, "Proof 2"))
      }

      const payment_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `## <:rbx:1447976733050667061> | New Payment`,
                `> Approve tanpa ngecek bukti dulu = instant demote`,
                ``,
                `- <:money:1381580383090380951> Amount: **${formatted_amount}**`,
                `- <:USERS:1381580388119613511> Customer: <@${customer.id}>`,
                `- <:calc:1381580377340117002> Payment Method: **${method}**`,
                `- <:JOBSS:1381580390330011732> Submitted by: <@${interaction.user.id}>`,
                `- <:app:1381680319207575552> Details: **${details}**`,
                `- <:OLOCK:1381580385892171816> Time: ${time.full_date_time(timestamp)}`,
              ]),
              component.divider(2),
              component.media_gallery(gallery_items),
              component.divider(2),
              component.action_row(
                component.success_button("Approve", `payment_approve_${interaction.user.id}_${amount}_${customer.id}_${interaction.channelId}`),
                component.danger_button("Reject", `payment_reject_${interaction.user.id}_${amount}_${customer.id}_${interaction.channelId}`)
              ),
            ],
          }),
        ],
      })

      const channel = interaction.client.channels.cache.get(payment_channel_id) as TextChannel
      if (!channel) {
        await interaction.editReply({ content: "Payment channel not found." })
        return
      }

      const result = await api.send_components_v2(channel.id, api.get_token(), payment_message)

      if (result.error) {
        await interaction.editReply({ content: `Error: ${JSON.stringify(result)}` })
        return
      }

      const logo_url = "https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_logo.png?raw=true"

      const review_message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## <:OLOCK:1381580385892171816> | Payment in Review`,
                  `Hello! Your payment is currently being processed by our team. This process may take approximately 1–2 hours (depending on the admin's online schedule). Once the payment is complete, you will receive a DM from our bot.`,
                  ``,
                  `Thank you for patiently waiting ❤️`,
                ],
                thumbnail: logo_url,
              }),
            ],
          }),
        ],
      })

      await api.send_components_v2(interaction.channelId, api.get_token(), review_message)

      try {
        const dm_channel = await customer.createDM()
        await api.send_components_v2(dm_channel.id, api.get_token(), review_message)
      } catch (err) {
        console.error("[DM Error]", err)
      }

      await interaction.editReply({ content: `Payment submitted for approval in <#${payment_channel_id}>` })
    } catch (err) {
      console.error("[Submit Payment Error]", err)
      if (interaction.deferred) {
        await interaction.editReply({ content: "An error occurred while submitting the payment." })
      } else {
        await interaction.reply({ content: "An error occurred while submitting the payment.", flags: 64 })
      }
    }
  },
}

export default command
