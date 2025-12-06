import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js"
import { Command } from "../../types/command"
import { component, api, format } from "../../utils"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

interface PricingConfig {
  channel_id:     string
  message_id:     string | null
  monthly_price:  number
  lifetime_price: number
  discount: {
    percentage: number
    applies_to: "monthly" | "lifetime" | "both"
  }
}

interface ExchangeRateResponse {
  result: string
  conversion_rates: {
    USD: number
    [key: string]: number
  }
}

async function get_usd_rate(): Promise<number> {
  try {
    const response = await fetch("https://v6.exchangerate-api.com/v6/latest/IDR")
    if (!response.ok) return 16000
    const data = await response.json() as ExchangeRateResponse
    return 1 / data.conversion_rates.USD
  } catch {
    return 16000
  }
}

function load_config(): PricingConfig {
  const file_path = join(__dirname, "../../configuration/pricing.cfg")
  return JSON.parse(readFileSync(file_path, "utf-8"))
}

function save_config(config: PricingConfig): void {
  const file_path = join(__dirname, "../../configuration/pricing.cfg")
  writeFileSync(file_path, JSON.stringify(config, null, 2))
}

function format_price(price: number, discount: number, applies: boolean): string {
  if (applies && discount > 0) {
    const discounted = price * (1 - discount / 100)
    return `~~Rp${price.toLocaleString()}~~ **Rp${discounted.toLocaleString()}** (-${discount}%)`
  }
  return `Rp${price.toLocaleString()}`
}

function format_usd(price: number, rate: number, discount: number, applies: boolean): string {
  let final_price = price
  if (applies && discount > 0) {
    final_price = price * (1 - discount / 100)
  }
  const usd = (final_price / rate).toFixed(2)
  return `$${usd}`
}

async function build_price_panel(config: PricingConfig): Promise<component.message_payload> {
  const { monthly_price, lifetime_price, discount } = config
  const usd_rate = await get_usd_rate()
  
  const monthly_applies   = discount.applies_to === "monthly" || discount.applies_to === "both"
  const lifetime_applies  = discount.applies_to === "lifetime" || discount.applies_to === "both"
  
  const monthly_formatted  = format_price(monthly_price, discount.percentage, monthly_applies)
  const lifetime_formatted = format_price(lifetime_price, discount.percentage, lifetime_applies)
  const monthly_usd        = format_usd(monthly_price, usd_rate, discount.percentage, monthly_applies)
  const lifetime_usd       = format_usd(lifetime_price, usd_rate, discount.percentage, lifetime_applies)

  return component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## <:PIG:1381580596349767771>  | Script Price`,
              `*(Prices may change without prior notice)*`,
            ],
            thumbnail: format.logo_url,
          }),
          component.divider(2),
          component.text([
            `### Service Provider Price:`,
            `- **Monthly:** ${monthly_formatted} - (${monthly_usd})`,
            `- **Lifetime:** ${lifetime_formatted} - (${lifetime_usd})`,
          ]),
          component.divider(2),
          component.text([
            `### Payment Method:`,
            `- <:qris:1251913366713139303> - QRIS`,
            `- <:paypal:1251913398816604381> - Paypal`,
            `- <:gopay:1251913342646489181> - Gopay`,
            `- Robux`,
          ]),
          component.action_row(
            component.link_button("Buy Script", "https://discord.com/channels/1250337227582472243/1250446131993903114")
          ),
        ],
      }),
    ],
  })
}

export async function update_price_panel(): Promise<boolean> {
  const config = load_config()
  if (!config.message_id) return false

  const message = await build_price_panel(config)
  const response = await api.edit_components_v2(
    config.channel_id,
    config.message_id,
    api.get_token(),
    message
  )

  return !response.error
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("script_price")
    .setDescription("Send the script pricing panel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const config  = load_config()
    const channel = interaction.client.channels.cache.get(config.channel_id) as TextChannel

    if (!channel) {
      await interaction.editReply({ content: "Pricing channel not found." })
      return
    }

    const message  = await build_price_panel(config)
    const response = await api.send_components_v2(
      config.channel_id,
      api.get_token(),
      message
    )

    if (response.error) {
      await interaction.editReply({ content: "Failed to send pricing panel." })
      return
    }

    config.message_id = response.id as string
    save_config(config)

    await interaction.editReply({ content: "Pricing panel sent!" })
  },
}
