/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /update-script 斜杠命令，更新脚本版本 - \
// - /update-script slash command, updates the script version - \
import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from "discord.js"
import { Command }                                                       from "@shared/types/command"
import { component, http, env, db }                                      from "@shared/utils"
import { log_error }                                                     from "@shared/utils/error_logger"

const __collection              = "luarmor_scripts"
const __key_details_url         = "https://api.luarmor.net/v3/keys"
const __loader_script_base_url  = "https://api.luarmor.net/files/v3/loaders"

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
 * - 获取 Luarmor API 密鑰 - \\
 * - get luarmor api key - \\
 * @returns {string} luarmor API key
 */
function get_api_key(): string {
  return env.required("LUARMOR_API_KEY")
}

/**
 * - 构建默认请求头 - \\
 * - build default headers - \\
 * @returns {Record<string, string>} headers for Luarmor API
 */
function build_headers(): Record<string, string> {
  return {
    "Content-Type" : "application/json",
    Authorization  : get_api_key(),
  }
}

/**
 * - 获取 API 密鑰详情 - \\
 * - fetch api key details - \\
 * @returns {Promise<luarmor_key_details_response>} key details response
 */
async function fetch_key_details(): Promise<luarmor_key_details_response> {
  const api_key = get_api_key()
  const url     = `${__key_details_url}/${api_key}/details`

  return http.get<luarmor_key_details_response>(url, build_headers())
}

/**
 * - 获取项目加载器脚本 - \\
 * - fetch project loader script - \\
 * @param {string} project_id - luarmor project ID
 * @returns {Promise<string>} loader script content
 */
async function fetch_loader_script(project_id: string): Promise<string> {
  const url = `${__loader_script_base_url}/${project_id}.lua`
  return http.get_text(url)
}

/**
 * - 唱入或更新项目脚本记录 - \\
 * - upsert project scripts record - \\
 * @param {luarmor_project_record} record - record to store
 * @returns {Promise<void>}
 */
async function upsert_project_record(record: luarmor_project_record): Promise<void> {
  await db.update_one<luarmor_project_record>(
    __collection,
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
    await interaction.deferReply({ flags: 64 })

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
