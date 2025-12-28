import { Client }        from "discord.js"
import { component, format } from "./index"

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
      `## Error in ${context}`,
      `${format.bold("Time:")} <t:${Math.floor(Date.now() / 1000)}:F>`,
      `${format.bold("Error:")} ${format.code_block(error.message)}`,
    ]

    if (error.stack) {
      const stack_lines   = error.stack.split('\n')
      const stack_preview = stack_lines.slice(0, 8).join('\n')
      error_details.push(`${format.bold("Stack:")} ${format.code_block(stack_preview, 'javascript')}`)
    }

    if (additional_info) {
      Object.entries(additional_info).forEach(([key, value]) => {
        const formatted_value = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
        error_details.push(`${format.bold(key + ":")} ${format.code(formatted_value)}`)
      })
    }

    const error_message = component.build_message({
      components: [
        component.container({
          accent_color: 0xED4245,
          components: [
            component.section({
              content  : error_details,
              thumbnail: "https://cdn.discordapp.com/emojis/1234567890.png",
            }),
          ],
        }),
      ],
    })

    await channel.send(error_message)
  } catch (log_err) {
    console.error("[Error Logger] Failed to log error:", log_err)
  }
}
