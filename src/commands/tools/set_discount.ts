import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js"
import { Command } from "../../types/command"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { update_price_panel } from "../setup/script_price"

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

function load_config(): PricingConfig {
  const file_path = join(__dirname, "../../configuration/pricing.cfg")
  return JSON.parse(readFileSync(file_path, "utf-8"))
}

function save_config(config: PricingConfig): void {
  const file_path = join(__dirname, "../../configuration/pricing.cfg")
  writeFileSync(file_path, JSON.stringify(config, null, 2))
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("set_discount")
    .setDescription("Set discount for script pricing")
    .addIntegerOption(option =>
      option
        .setName("percentage")
        .setDescription("Discount percentage (0-100)")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100)
    )
    .addStringOption(option =>
      option
        .setName("applies_to")
        .setDescription("Apply discount to which price")
        .setRequired(true)
        .addChoices(
          { name: "Monthly",  value: "monthly" },
          { name: "Lifetime", value: "lifetime" },
          { name: "Both",     value: "both" }
        )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const percentage = interaction.options.getInteger("percentage", true)
    const applies_to = interaction.options.getString("applies_to", true) as "monthly" | "lifetime" | "both"

    const config = load_config()
    config.discount.percentage = percentage
    config.discount.applies_to = applies_to
    save_config(config)

    if (config.message_id) {
      const updated = await update_price_panel()
      if (updated) {
        await interaction.editReply({
          content: `Discount set to **${percentage}%** for **${applies_to}** and pricing panel updated!`,
        })
      } else {
        await interaction.editReply({
          content: `Discount set to **${percentage}%** for **${applies_to}** but failed to update panel.`,
        })
      }
    } else {
      await interaction.editReply({
        content: `Discount set to **${percentage}%** for **${applies_to}**. Use \`/script_price\` to send the panel.`,
      })
    }
  },
}
