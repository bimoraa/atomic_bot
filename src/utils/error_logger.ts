import { Client }   from "discord.js"
import { component } from "./index"

const error_log_channel_id = "1452322637609963530"

export async function log_error(
  client: Client,
  error: Error,
  context: string,
  additional_info?: Record<string, any>
): Promise<void> {
  try {
    const channel = await client.channels.fetch(error_log_channel_id)
    if (!channel?.isTextBased() || !("send" in channel)) return

    const error_details = [
      `### Error in ${context}`,
      `- Time: <t:${Math.floor(Date.now() / 1000)}:F>`,
      `- Error: ${error.message}`,
    ]

    if (error.stack) {
      const stack_preview = error.stack.split('\n').slice(0, 5).join('\n')
      error_details.push(`- Stack: \`\`\`\n${stack_preview}\n\`\`\``)
    }

    if (additional_info) {
      Object.entries(additional_info).forEach(([key, value]) => {
        error_details.push(`- ${key}: ${JSON.stringify(value)}`)
      })
    }

    const error_message = component.build_message({
      components: [
        component.container({
          accent_color: 0xED4245,
          components: [
            component.text(error_details.join("\n")),
          ],
        }),
      ],
    })

    await channel.send(error_message)
  } catch (log_err) {
    console.error("[Error Logger] Failed to log error:", log_err)
  }
}
