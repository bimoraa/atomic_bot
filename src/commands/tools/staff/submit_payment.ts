import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember, TextChannel, ThreadChannel, MessageFlags } from "discord.js"
import { Command }                        from "../../../types/command"
import { is_staff }                       from "../../../services/permissions"
import { api, time, component }           from "../../../utils"
import { log_error }                      from "../../../utils/error_logger"
import { load_config }                    from "../../../configuration/loader"
import { create_key_for_project, delete_user_from_project } from "../../../services/luarmor"
import { add_work_log }                   from "../../../services/work_tracker"

const payment_cfg             = load_config<{ submit_channel_id: string }>("payment")
const payment_channel_id      = payment_cfg.submit_channel_id
const ALLOWED_PARENT_CHANNEL  = "1250446131993903114"
const LOGO_URL                = "https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_logo.png?raw=true"
const LOG_CHANNEL_ID          = "1392574025498366061"
const WHITELIST_PROJECT_ID    = "6958841b2d9e5e049a24a23e376e0d77"
const BOT_USER_ID             = "1118453649727823974"
const MAX_WHITELIST_RETRIES   = 3

/**
 * Sleep for specified milliseconds.
 * @param ms Milliseconds to sleep.
 * @returns Promise resolving after delay.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

type payment_message_state = "loading" | "ready"

interface payment_message_params {
  formatted_amount: string
  customer_id     : string
  method          : string
  details         : string
  staff_id        : string
  timestamp       : number
  gallery_items   : component.gallery_item[]
  state           : payment_message_state
  amount_value    : number
  channel_id      : string
}

/**
 * Build payment review message with loading or ready state.
 * @param params Message parameters including state.
 * @returns Formatted message payload.
 */
function build_payment_message(params: payment_message_params) {
  const {
    formatted_amount,
    customer_id,
    method,
    details,
    staff_id,
    timestamp,
    gallery_items,
    state,
    amount_value,
    channel_id,
  } = params

  const status_line = state === "loading"
    ? "- Status: Loading payment details..."
    : "> Approve tanpa ngecek bukti dulu = instant demote"

  const approve_btn = component.success_button(
    "Approve",
    `payment_approve_${staff_id}_${amount_value}_${customer_id}_${channel_id}`,
    undefined,
    state === "loading"
  )
  const reject_btn = component.danger_button(
    "Reject",
    `payment_reject_${staff_id}_${amount_value}_${customer_id}_${channel_id}`,
    undefined,
    state === "loading"
  )

  return component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            "## <:rbx:1447976733050667061> | New Payment",
            status_line,
            "",
            `- <:money:1381580383090380951> Amount: **${formatted_amount}**`,
            `- <:USERS:1381580388119613511> Customer: <@${customer_id}>`,
            `- <:calc:1381580377340117002> Payment Method: **${method}**`,
            `- <:JOBSS:1381580390330011732> Submitted by: <@${staff_id}>`,
            `- <:app:1381680319207575552> Details: **${details}**`,
            `- <:OLOCK:1381580385892171816> Time: ${time.full_date_time(timestamp)}`,
          ]),
          component.divider(2),
          component.media_gallery(gallery_items),
          component.divider(2),
          component.action_row(approve_btn, reject_btn),
        ],
      }),
    ],
  })
}

/**
 * Generate unique payment ID.
 * @returns Payment ID string.
 */
function generate_payment_id(): string {
  const random = Math.floor(1000 + Math.random() * 9000)
  return `ATMC-${random}`
}

/**
 * Auto-approve payment and log to payment log channel.
 * @param interaction Command interaction.
 * @param payment_data Payment details.
 * @param gallery_items Proof images.
 * @param pending_message_id Message ID in payment channel.
 * @returns Promise resolving when approval is complete.
 */
async function auto_approve_payment(
  interaction: ChatInputCommandInteraction,
  payment_data: {
    formatted_amount: string
    customer_id     : string
    method          : string
    details         : string
    staff_id        : string
    timestamp       : number
    amount_value    : number
    channel_id      : string
  },
  gallery_items: component.gallery_item[],
  pending_message_id: string
): Promise<void> {
  const { formatted_amount, customer_id, method, details, staff_id, timestamp, amount_value, channel_id } = payment_data
  const payment_id   = generate_payment_id()
  const thread_link  = `https://discord.com/channels/${interaction.guildId}/${channel_id}`
  const message_link = `https://discord.com/channels/${interaction.guildId}/${payment_channel_id}/${pending_message_id}`
  const whitelist_note = `AUTO-WHITELISTED by submit-payment - at ${time.full_date_time(time.now())}`

  await delete_user_from_project(WHITELIST_PROJECT_ID, customer_id)

  let whitelist_result: any = null
  let retry_count = 0
  let last_error: Error | null = null

  while (retry_count < MAX_WHITELIST_RETRIES) {
    try {
      if (retry_count > 0) {
        const retry_delay = Math.pow(2, retry_count) * 1000
        await sleep(retry_delay)

        const retry_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## <:rbx:1447976733050667061> | New Payment",
                  `> Retrying whitelist (Attempt ${retry_count + 1}/${MAX_WHITELIST_RETRIES})...`,
                  "",
                  `- <:money:1381580383090380951> Amount: **${formatted_amount}**`,
                  `- <:USERS:1381580388119613511> Customer: <@${customer_id}>`,
                  `- <:calc:1381580377340117002> Payment Method: **${method}**`,
                  `- <:JOBSS:1381580390330011732> Submitted by: <@${staff_id}>`,
                  `- <:app:1381680319207575552> Details: **${details}**`,
                  `- <:OLOCK:1381580385892171816> Time: ${time.full_date_time(timestamp)}`,
                ]),
                component.divider(2),
                component.media_gallery(gallery_items),
                component.divider(2),
                component.action_row(
                  component.success_button("Approve", `payment_approve_${staff_id}_${amount_value}_${customer_id}_${channel_id}`, undefined, true),
                  component.danger_button("Reject", `payment_reject_${staff_id}_${amount_value}_${customer_id}_${channel_id}`, undefined, true)
                ),
              ],
            }),
          ],
        })

        await api.edit_components_v2(
          payment_channel_id,
          pending_message_id,
          api.get_token(),
          retry_message
        )
      }

      whitelist_result = await create_key_for_project(WHITELIST_PROJECT_ID, {
        discord_id: customer_id,
        note      : whitelist_note,
      })

      if (whitelist_result.success && whitelist_result.data?.user_key) {
        break
      }

      last_error = new Error(whitelist_result.error || "Unknown whitelist error")
      retry_count++
    } catch (err) {
      last_error = err as Error
      retry_count++
    }
  }

  if (!whitelist_result?.success || !whitelist_result?.data?.user_key) {
    throw last_error || new Error("Failed to whitelist user after retries")
  }

  const submitter  = await interaction.guild?.members.fetch(staff_id).catch(() => null)
  const staff_name = submitter?.user.username || `Unknown (${staff_id})`

  await add_work_log(staff_id, staff_name, "ticket", message_link, undefined, amount_value)

  const approved_message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              "## <:money:1381580383090380951> | Whitelisted!",
              "Your payment has been approved and you have been whitelisted!",
            ],
            thumbnail: LOGO_URL,
          }),
        ],
      }),
    ],
  })

  await api.send_components_v2(channel_id, api.get_token(), approved_message)

  try {
    const customer   = await interaction.client.users.fetch(customer_id)
    const dm_channel = await customer.createDM()
    await api.send_components_v2(dm_channel.id, api.get_token(), approved_message)
  } catch (err) {
    console.error("[DM Error]", err)
  }

  const done_message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            "## <:rbx:1447976733050667061> | Payment Done!",
            "> Auto-approved by system",
            "",
            "### Payment Information",
            `- <:money:1381580383090380951> Amount: **${formatted_amount}**`,
            `- <:USERS:1381580388119613511> Customer Discord: <@${customer_id}>`,
            `- <:calc:1381580377340117002> Payment Method: **${method}**`,
            `- <:JOBSS:1381580390330011732> Submitted by: <@${staff_id}>`,
            `- <:app:1381680319207575552> Transaction Details: **${details}**`,
            `- <:OLOCK:1381580385892171816> Time: ${time.full_date_time(timestamp)}`,
            "",
            "### Approval Information",
            `- <:USERS:1381580388119613511> Approved by: <@${BOT_USER_ID}>`,
            `- <:app:1381680319207575552> Payment ID: **${payment_id}**`,
          ]),
          component.divider(2),
          ...(gallery_items.length > 0 ? [component.media_gallery(gallery_items), component.divider(2)] : []),
          component.action_row(
            component.link_button("View Ticket (Thread)", thread_link)
          ),
        ],
      }),
    ],
  })

  await api.send_components_v2(LOG_CHANNEL_ID, api.get_token(), done_message)

  await api.delete_message(payment_channel_id, pending_message_id, api.get_token())
}

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
          flags  : MessageFlags.Ephemeral,
        })
        return
      }

      if (!is_staff(member)) {
        await interaction.reply({
          content: "Only staff can submit payments.",
          flags  : MessageFlags.Ephemeral,
        })
        return
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral })

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

      const channel = interaction.client.channels.cache.get(payment_channel_id) as TextChannel
      if (!channel) {
        await interaction.editReply({ content: "Payment channel not found." })
        return
      }

      const loading_message = build_payment_message({
        formatted_amount,
        customer_id  : customer.id,
        method,
        details,
        staff_id     : interaction.user.id,
        timestamp,
        gallery_items,
        state        : "loading",
        amount_value : amount,
        channel_id   : interaction.channelId,
      })

      const pending_result = await api.send_components_v2(channel.id, api.get_token(), loading_message)

      if (pending_result.error || !pending_result.id) {
        await interaction.editReply({ content: `Error: ${JSON.stringify(pending_result)}` })
        return
      }

      const ready_message = build_payment_message({
        formatted_amount,
        customer_id  : customer.id,
        method,
        details,
        staff_id     : interaction.user.id,
        timestamp,
        gallery_items,
        state        : "ready",
        amount_value : amount,
        channel_id   : interaction.channelId,
      })

      const update_result = await api.edit_components_v2(
        payment_channel_id,
        pending_result.id,
        api.get_token(),
        ready_message
      )

      if (update_result.error) {
        await interaction.editReply({ content: `Error: ${JSON.stringify(update_result)}` })
        return
      }

      await sleep(400)

      const processing_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## <:rbx:1447976733050667061> | New Payment",
                `> Processing payment by <@${interaction.user.id}>...`,
                "",
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
                component.success_button("Approve", `payment_approve_${interaction.user.id}_${amount}_${customer.id}_${interaction.channelId}`, undefined, true),
                component.danger_button("Reject", `payment_reject_${interaction.user.id}_${amount}_${customer.id}_${interaction.channelId}`, undefined, true)
              ),
            ],
          }),
        ],
      })

      await api.edit_components_v2(
        payment_channel_id,
        pending_result.id,
        api.get_token(),
        processing_message
      )

      try {
        await auto_approve_payment(
          interaction,
          {
            formatted_amount,
            customer_id  : customer.id,
            method,
            details,
            staff_id     : interaction.user.id,
            timestamp,
            amount_value : amount,
            channel_id   : interaction.channelId,
          },
          gallery_items,
          pending_result.id
        )

        await interaction.editReply({ content: `Payment submitted for review. Staff will review the payment shortly.` })
      } catch (approve_err) {
        await log_error(interaction.client, approve_err as Error, "submit_payment_auto_approve", {
          user       : interaction.user.id,
          channel    : interaction.channelId,
          guild_id   : interaction.guildId,
          customer_id: customer.id,
        })

        const manual_approval_message = component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex("#FFA500"),
              components: [
                component.text([
                  "## <:rbx:1447976733050667061> | New Payment",
                  `> Auto-approval failed after ${MAX_WHITELIST_RETRIES} attempts. Manual approval required.`,
                  "",
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
                  component.success_button("Approve", `payment_approve_${interaction.user.id}_${amount}_${customer.id}_${interaction.channelId}`, undefined, false),
                  component.danger_button("Reject", `payment_reject_${interaction.user.id}_${amount}_${customer.id}_${interaction.channelId}`, undefined, false)
                ),
              ],
            }),
          ],
        })

        await api.edit_components_v2(
          payment_channel_id,
          pending_result.id,
          api.get_token(),
          manual_approval_message
        )

        await interaction.editReply({ content: `Auto-approval failed after ${MAX_WHITELIST_RETRIES} attempts. Payment submitted for manual approval.` })
        return
      }
    } catch (err) {
      await log_error(interaction.client, err as Error, "submit_payment_command", {
        user    : interaction.user.id,
        channel : interaction.channelId,
        guild_id: interaction.guildId,
      })

      const error_payload = component.build_message({
        components: [
          component.container({
            accent_color: component.from_hex("#FF0000"),
            components  : [
              component.text([
                "## Error",
                "An error occurred while submitting the payment. Please try again later.",
              ]),
            ],
          }),
        ],
      })

      if (interaction.deferred) {
        await interaction.editReply(error_payload)
      } else {
        await interaction.reply({ ...error_payload, flags: MessageFlags.Ephemeral })
      }
    }
  },
}

export default command
