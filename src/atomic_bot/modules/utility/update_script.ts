import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from "discord.js"
import { Command }                                                       from "@shared/types/command"
import { component, http, env, db }                                      from "@shared/utils"
import { log_error }                                                     from "@shared/utils/error_logger"

const COLLECTION              = "luarmor_scripts"
const KEY_DETAILS_URL         = "https://api.luarmor.net/v3/keys"
const LOADER_SCRIPT_BASE_URL  = "https://api.luarmor.net/files/v3/loaders"

interface luarmor_script_info {
  script_name     : string
  script_id       : string
  script_version  : string
  ffa             : boolean
  silent          : boolean
}

interface luarmor_project_info {
  platform : string
  id       : string
  name     : string
  scripts? : luarmor_script_info[]
}

interface luarmor_key_details_response {
  success  : boolean
  message? : string
  projects?: luarmor_project_info[]
}

interface luarmor_project_record {
  project_id     : string
  project_name   : string
  platform       : string
  scripts        : luarmor_script_info[]
  loader_script  : string
  updated_at     : number
  updated_by     : string
}

/**
 * - GET LUARMOR API KEY - \\
 * @returns {string} Luarmor API key
 */
function get_api_key(): string {
  return env.required("LUARMOR_API_KEY")
}

/**
 * - BUILD DEFAULT HEADERS - \\
 * @returns {Record<string, string>} Headers for Luarmor API
 */
function build_headers(): Record<string, string> {
  return {
    "Content-Type" : "application/json",
    Authorization  : get_api_key(),
  }
}

/**
 * - FETCH API KEY DETAILS - \\
 * @returns {Promise<luarmor_key_details_response>} Key details response
 */
async function fetch_key_details(): Promise<luarmor_key_details_response> {
  const api_key = get_api_key()
  const url     = `${KEY_DETAILS_URL}/${api_key}/details`

  return http.get<luarmor_key_details_response>(url, build_headers())
}

/**
 * - FETCH PROJECT LOADER SCRIPT - \\
 * @param {string} project_id - Luarmor project ID
 * @returns {Promise<string>} Loader script content
 */
async function fetch_loader_script(project_id: string): Promise<string> {
  const url = `${LOADER_SCRIPT_BASE_URL}/${project_id}.lua`
  return http.get_text(url)
}

/**
 * - UPSERT PROJECT SCRIPTS RECORD - \\
 * @param {luarmor_project_record} record - Record to store
 * @returns {Promise<void>}
 */
async function upsert_project_record(record: luarmor_project_record): Promise<void> {
  await db.update_one<luarmor_project_record>(
    COLLECTION,
    { project_id: record.project_id },
    record,
    true
  )
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("update-script")
    .setDescription("Fetch and store all Luarmor scripts")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    try {
      const details = await fetch_key_details()

      if (!details.success || !details.projects) {
        const error_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## Error",
                  details.message || "Failed to fetch Luarmor key details.",
                ]),
              ],
            }),
          ],
        })

        await interaction.editReply(error_message)
        return
      }

      let project_count = 0
      let script_count  = 0
      let stored_count  = 0

      for (const project of details.projects) {
        project_count += 1

        const loader_script = await fetch_loader_script(project.id)
        const scripts       = Array.isArray(project.scripts) ? project.scripts : []

        script_count += scripts.length

        await upsert_project_record({
          project_id    : project.id,
          project_name  : project.name,
          platform      : project.platform,
          scripts       : scripts,
          loader_script : loader_script,
          updated_at    : Date.now(),
          updated_by    : interaction.user.id,
        })

        stored_count += 1
      }

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Luarmor Scripts Updated",
                `Projects: **${project_count}**`,
                `Scripts: **${script_count}**`,
                `Records Stored: **${stored_count}**`,
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(message)
    } catch (error) {
      console.error("[ - UPDATE SCRIPT - ] Error:", error)
      await log_error(interaction.client, error as Error, "Update Script Command", {
        user_id   : interaction.user.id,
        guild_id  : interaction.guildId || "",
        channel_id: interaction.channelId || "",
      })

      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Error",
                "Failed to update scripts. Please try again later.",
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(error_message)
    }
  },
}
