import { Buffer }            from "buffer"
import { Client, ButtonInteraction } from "discord.js"
import { component, format }         from "./index"

const error_log_channel_id = "1452322637609963530"

const error_payload_store = new Map<string, string>()
const error_context_count = new Map<string, number>()

function build_error_payload(
  error_id: string,
  context: string,
  error: Error,
  additional_info?: Record<string, any>
): string {
  const payload = {
    id             : error_id,
    context        : context,
    timestamp      : Date.now(),
    message        : error.message,
    stack          : error.stack || null,
    additional_info: additional_info || {},
  }
  return JSON.stringify(payload, null, 2)
}

export async function log_error(
  client: Client,
  error: Error,
  context: string,
  additional_info?: Record<string, any>
): Promise<void> {
  try {
    const error_id      = `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const current_count = (error_context_count.get(context) || 0) + 1
    error_context_count.set(context, current_count)

    const payload_json = build_error_payload(error_id, context, error, additional_info)
    error_payload_store.set(error_id, payload_json)

    const channel = await client.channels.fetch(error_log_channel_id)
    if (!channel?.isTextBased() || !("send" in channel)) return

    const now_ts = Math.floor(Date.now() / 1000)

    const user_text    = additional_info?.user ? `${additional_info.user}` : "Unknown"
    const channel_text = additional_info?.channel ? `<#${additional_info.channel}>` : "Unknown"
    const function_text = additional_info?.function || additional_info?.handler || additional_info?.custom_id || "N/A"

    const error_preview = format.code_block(
      JSON.stringify(
        {
          error: error.message,
          name : error.name,
        },
        null,
        2
      ),
      "javascript"
    )

    const stack_preview = error.stack
      ? format.code_block(error.stack.split("\n").slice(0, 12).join("\n"), "javascript")
      : format.code_block("No stack available", "javascript")

    const additional_block = additional_info
      ? format.code_block(JSON.stringify(additional_info, null, 2), "json")
      : format.code_block("{}", "json")

    const error_message = component.build_message({
      components: [
        component.container({
          components: [
            {
              type     : component.component_type.section,
              components: [component.text(`## Error in ${context}`)],
              accessory: component.secondary_button("Download Detail (JSON)", `error_log_download:${error_id}`),
            },
          ],
        }),
        component.container({
          components: [
            component.text(
              [
                `${format.bold("User:")} ${user_text}`,
                `${format.bold("Channel:")} ${channel_text}`,
                `${format.bold("Function:")} ${format.code(function_text)}`,
                `${format.bold("Time:")} <t:${now_ts}:F>`,
              ].join("\n")
            ),
            component.divider(2),
            component.text(`${format.bold("Error:")}\n${error_preview}`),
            component.divider(2),
            component.text(`${format.bold("Stack:")}\n${stack_preview}`),
            component.divider(2),
            component.text(`${format.bold("Additional Info:")}\n${additional_block}`),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.secondary_button("Full Details (JSON)", `error_log_full:${error_id}`),
              component.secondary_button(`Total Error Report: ${current_count}x`, "error_log_count", undefined, true)
            ),
          ],
        }),
      ],
    })

    await channel.send(error_message)
  } catch (log_err) {
    console.error("[Error Logger] Failed to log error:", log_err)
  }
}

export async function handle_error_log_button(interaction: ButtonInteraction, client: Client): Promise<boolean> {
  if (!interaction.customId.startsWith("error_log_")) return false
  try {
    const parts = interaction.customId.split(":")
    const action = parts[0]
    const error_id = parts[1]

    if (!error_id) {
      await interaction.reply({ content: "Error payload not found", ephemeral: true })
      return true
    }

    const payload = error_payload_store.get(error_id)
    if (!payload) {
      await interaction.reply({ content: "Error payload expired", ephemeral: true })
      return true
    }

    if (action === "error_log_download" || action === "error_log_full") {
      const file_name = `error_${error_id}.json`
      const buffer    = Buffer.from(payload, "utf-8")
      await interaction.reply({
        content  : "Sent error detail JSON",
        ephemeral: true,
        files    : [{ attachment: buffer, name: file_name }],
      })
      return true
    }

    await interaction.reply({ content: "Unknown error log action", ephemeral: true })
    return true
  } catch (err) {
    console.error("[Error Logger] Failed handling button:", err)
    await log_error(client, err as Error, "Error Logger Button", {
      custom_id: interaction.customId,
      user     : interaction.user.tag,
      channel  : interaction.channel?.id,
    })
    if (!interaction.replied) {
      await interaction.reply({ content: "Failed to process error log button", ephemeral: true }).catch(() => {})
    }
    return true
  }
}
