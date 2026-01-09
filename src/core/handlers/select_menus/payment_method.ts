import { StringSelectMenuInteraction } from "discord.js"
import { component, api } from "../../../shared/utils"

const payment_details: Record<string, { title: string; content: string[]; image?: string }> = {
  qris: {
    title: "QRIS Payment",
    content: [
      `### <:qris:1251913366713139303> QRIS`,
      ``,
      `Scan the QR code below to pay instantly.`,
      ``,
      `> **Supported:** All banks, e-wallets (Dana, GoPay, OVO, ShopeePay, etc.)`,
    ],
    image: "https://raw.githubusercontent.com/bimoraa/atomic_bot/main/assets/images/QRIS.png",
  },
  dana: {
    title: "Dana Payment",
    content: [
      `### <:dana:1251913282923790379> Dana`,
      ``,
      `**Phone:** \`0895418425934\``,
      `**Name:** Nurlaela / Rian Febriansyah`,
      ``,
      `> Transfer to the number above and send screenshot as proof.`,
    ],
  },
  gopay: {
    title: "GoPay Payment",
    content: [
      `### <:gopay:1251913342646489181> GoPay`,
      ``,
      `**Phone:** \`0895418425934\``,
      `**Name:** Nurlaela / Rian Febriansyah`,
      ``,
      `> Transfer to the number above and send screenshot as proof.`,
    ],
  },
  paypal: {
    title: "PayPal Payment",
    content: [
      `### <:paypal:1251913398816604381> PayPal`,
      ``,
      `**Email:** \`starrykitsch@gmail.com\``,
      `**Name:** Rian Febriansyah`,
      ``,
      `> Send as **Friends & Family** to avoid fees.`,
      `> Send screenshot as proof after payment.`,
    ],
  },
}

export async function handle_payment_method_select(interaction: StringSelectMenuInteraction): Promise<void> {
  const selected = interaction.values[0]
  const details = payment_details[selected]

  if (!details) {
    await interaction.reply({
      content: "Payment method not found.",
      flags: 64,
    })
    return
  }

  await interaction.deferReply({ flags: 32832 } as any)

  let message: any

  if (details.image) {
    message = {
      flags: 32832,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: details.content.join("\n"),
            },
            {
              type: 14,
              spacing: 2,
            },
            {
              type: 12,
              items: [
                {
                  media: {
                    url: details.image,
                  },
                },
              ],
            },
          ],
        },
      ],
    }
  } else {
    message = {
      flags: 32832,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: details.content.join("\n"),
            },
          ],
        },
      ],
    }
  }

  const token = api.get_token()
  await fetch(`https://discord.com/api/v10/webhooks/${interaction.client.user?.id}/${interaction.token}/messages/@original`, {
    method: "PATCH",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  })
}
