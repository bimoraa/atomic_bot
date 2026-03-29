/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 脚本模块控制器，处理 /push-script 的全部业务逻辑 - \\
// - scripts module controller, handles all business logic for /push-script - \\
import { randomBytes } from "crypto"
import { component }   from "@shared/utils"
import * as luarmor    from "@atomic/infrastructure/api/luarmor"

interface attachment_ref {
  url      : string
  filename : string
}

const __attachment_cache = new Map<string, attachment_ref>()

/**
 * @description stores an attachment url+filename in memory and returns a short key
 * @param {string} url      - discord attachment cdn url
 * @param {string} filename - original filename
 * @returns {string} short 8-char hex key
 */
function store_attachment(url: string, filename: string): string {
  const key = randomBytes(4).toString("hex")
  __attachment_cache.set(key, { url, filename })
  return key
}

/**
 * @description retrieves an attachment ref by its short key
 * @param {string} key - the 8-char hex key
 * @returns {attachment_ref | undefined}
 */
export function resolve_attachment(key: string): attachment_ref | undefined {
  return __attachment_cache.get(key)
}

/**
 * @description fetches text content from a url and counts its lines
 * @param {string} url - url to fetch
 * @returns {Promise<{ content: string; line_count: number }>}
 */
async function fetch_file_content(url: string): Promise<{ content: string; line_count: number }> {
  const response   = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch attachment: ${response.status}`)
  const content    = await response.text()
  const line_count = content.split("\n").length
  return { content, line_count }
}

/**
 * @description builds the select menu component block shared by both message builders
 * @param {string} ref_key       - short attachment cache key
 * @param {string} filename      - original filename for display
 * @param {number} line_count    - number of lines in the file
 * @param {string} placeholder   - select menu placeholder text
 * @param {string} script_id     - currently selected script_id (or "none")
 * @param {Array}  select_options - options array for the select menu
 * @returns {any[]} array of components for the select container
 */
function build_select_container(
  ref_key        : string,
  filename       : string,
  line_count     : number,
  placeholder    : string,
  script_id      : string,
  select_options : { label: string; value: string; description: string }[]
): any[] {

  return [
    component.container({
      components: [
        component.text("## Push Script"),
      ],
    }),
    component.container({
      components: [
        component.text([
          `- File: \`${filename}\``,
          `- Lines: ${line_count}`,
          "",
        ]),
      ],
    }),
    component.container({
      components: [
        component.text("### Select Script to Update\n"),
        {
          type: 1,
          components: [
            {
              type       : 3,
              custom_id  : `script_update_select:${ref_key}`,
              placeholder,
              min_values : 1,
              max_values : 1,
              options    : select_options,
            } as any,
          ],
        },
        component.divider(2),
        component.section({
          content  : "Update now: ",
          accessory: component.secondary_button("Update", `script_update_btn:${ref_key}:${script_id}`),
        }),
      ],
    }),
  ]
}

/**
 * @description builds the initial /push-script message
 * @param {string} attachment_url - discord attachment url
 * @param {string} filename       - original filename for display
 * @returns {Promise<object>} component v2 message object
 */
export async function build_update_script_message(attachment_url: string, filename: string): Promise<object> {
  const ref_key        = store_attachment(attachment_url, filename)
  const { line_count } = await fetch_file_content(attachment_url)
  const scripts_result = await luarmor.get_project_scripts()

  const select_options = scripts_result.success && scripts_result.data?.length
    ? scripts_result.data.map((s) => ({
        label      : s.script_name,
        value      : s.script_id,
        description: `v${s.script_version}`,
      }))
    : [{ label: "No scripts found", value: "none", description: "Check your Luarmor project" }]

  return component.build_message({
    components: build_select_container(
      ref_key,
      filename,
      line_count,
      "Select script",
      "none",
      select_options
    ) as any,
  })
}

/**
 * @description builds the message after a script is chosen from the dropdown
 * @param {string} ref_key   - short attachment cache key
 * @param {string} script_id - selected luarmor script id
 * @returns {Promise<object>} component v2 message object
 */
export async function build_select_update_message(ref_key: string, script_id: string): Promise<object> {
  const ref = resolve_attachment(ref_key)
  if (!ref) throw new Error("Attachment reference expired. Please run the command again.")

  const { line_count } = await fetch_file_content(ref.url)
  const scripts_result = await luarmor.get_project_scripts()

  const selected    = scripts_result.data?.find((s) => s.script_id === script_id)
  const script_name = selected?.script_name ?? script_id

  const select_options = scripts_result.success && scripts_result.data?.length
    ? scripts_result.data.map((s) => ({
        label      : s.script_name,
        value      : s.script_id,
        description: `v${s.script_version}`,
      }))
    : [{ label: script_name, value: script_id, description: "Selected" }]

  return component.build_message({
    components: build_select_container(
      ref_key,
      ref.filename,
      line_count,
      script_name,
      script_id,
      select_options
    ) as any,
  })
}

export interface perform_update_result {
  success     : boolean
  error       : string | undefined
  script_name : string
  old_version : string
  new_version : string
}

/**
 * @description fetches attachment content and puts it to luarmor, then returns version diff
 * @param {string} ref_key   - short attachment cache key
 * @param {string} script_id - luarmor script id to update
 * @returns {Promise<perform_update_result>} result with version info
 */
export async function perform_script_update(ref_key: string, script_id: string): Promise<perform_update_result> {
  const ref = resolve_attachment(ref_key)
  if (!ref) throw new Error("Attachment reference expired. Please run the command again.")

  const scripts_before = await luarmor.get_project_scripts()
  const before         = scripts_before.data?.find((s) => s.script_id === script_id)
  const script_name    = before?.script_name    ?? script_id
  const old_version    = before?.script_version ?? "????"
  const project_id     = before?.project_id     ?? ""

  if (!project_id) {
    return { success: false, error: "Could not determine project for this script.", script_name, old_version, new_version: old_version }
  }

  const { content } = await fetch_file_content(ref.url)
  const result      = await luarmor.update_script(script_id, content, project_id)

  if (!result.success) {
    return { success: false, error: result.error, script_name, old_version, new_version: old_version }
  }

  const scripts_after = await luarmor.get_project_scripts()
  const after         = scripts_after.data?.find((s) => s.script_id === script_id)
  const new_version   = after?.script_version ?? old_version

  __attachment_cache.delete(ref_key)

  return { success: true, error: undefined, script_name, old_version, new_version }
}
