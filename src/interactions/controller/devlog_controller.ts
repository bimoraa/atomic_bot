import { Client }         from "discord.js"
import { load_config }   from "../../configuration/loader"
import { component, api, format, time } from "../../utils"
import { log_error }     from "../../utils/error_logger"

const config            = load_config<{ devlog_channel_id: string; priority_role_id: string }>("devlog")
const devlog_channel_id = config.devlog_channel_id
const priority_role_id  = config.priority_role_id
const devlog_thumb_url  = "https://github.com/bimoraa/Euphoria/blob/main/aaaaa.png?raw=true"

interface devlog_options {
  client    : Client
  script    : string
  version   : string
  added     : string
  improved  : string
  removed   : string
  fixed     : string
  role_ids? : string[]
}

function format_list(items: string, prefix: string): string {
  if (!items.trim()) return ""
  return items
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => `${prefix} ${line.trim()}`)
    .join("\n")
}

export async function publish_devlog(options: devlog_options) {
  const { client, script, version, added, improved, removed, fixed, role_ids } = options

  try {
    const added_list    = format_list(added, "[ + ]")
    const improved_list = format_list(improved, "[ / ]")
    const removed_list  = format_list(removed, "[ - ]")
    const fixed_list    = format_list(fixed, "[ ! ]")

    const changelog_components = [] as ReturnType<typeof component.text | typeof component.divider>[]

    if (added_list) {
      changelog_components.push(component.text(`### - Added:\n${added_list}`))
      changelog_components.push(component.divider(2))
    }

    if (removed_list) {
      changelog_components.push(component.text(`### - Deleted:\n${removed_list}`))
      changelog_components.push(component.divider(2))
    }

    if (fixed_list) {
      changelog_components.push(component.text(`### - Fixed:\n${fixed_list}`))
      changelog_components.push(component.divider(2))
    }

    if (improved_list) {
      changelog_components.push(component.text(`### - Improved:\n${improved_list}`))
    }

    if (changelog_components.length > 0 && changelog_components[changelog_components.length - 1].type === component.component_type.divider) {
      changelog_components.pop()
    }

    if (changelog_components.length === 0) {
      changelog_components.push(component.text("No changes specified."))
    }

    const role_mentions = (role_ids && role_ids.length > 0 ? role_ids : [priority_role_id])
      .map(id => format.role_mention(id))
      .join(" ")

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                "## Atomicals Script Update Logs",
                role_mentions,
                `- **Place:** ${script}`,
                `- **Version:** v${version}`,
                "- **Developer Notes:**",
                "> Found any bugs or issues? Feel free to report them to the developers!",
                "> Got ideas or suggestions for new scripts? We'd love to hear them!",
              ],
              thumbnail: devlog_thumb_url,
            }),
            component.divider(),
            ...changelog_components,
          ],
        }),
      ],
    })

    const response = await api.send_components_v2(
      devlog_channel_id,
      api.get_token(),
      message
    )

    if (response.error) {
      return {
        success : false,
        error   : "Failed to publish devlog",
      }
    }

    return {
      success     : true,
      message     : "Devlog published successfully!",
      message_id  : response.id,
    }
  } catch (err) {
    await log_error(client, err as Error, "Devlog Controller", {
      script,
      version,
    }).catch(() => {})

    return {
      success : false,
      error   : "Failed to publish devlog",
    }
  }
}
