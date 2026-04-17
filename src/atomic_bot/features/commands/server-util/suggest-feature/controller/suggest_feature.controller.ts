/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 功能建议控制器，业务逻辑 - \\
// - feature suggestion controller, business logic - \\
import { randomUUID }                    from "crypto"
import { Client, TextChannel }           from "discord.js"
import { component }                     from "@utils"
import { log_error }                     from "@utils/error_logger"
import { __suggestion_channel_id }       from "@constants/channels"
import { __btn_suggest_upvote }          from "@constants/custom_ids"
import type { suggestion_data }          from "@models/suggestion.model"
import {
  create_suggestion,
  find_suggestion,
  update_suggestion,
  upsert_vote,
  remove_vote,
  has_voted,
  get_vote_count,
}                                        from "@managers/suggestion.manager"

const __web_url = process.env.NEXT_PUBLIC_WEB_URL || "https://azure48.xyz"

/**
 * @description generate a new suggestion token (uuid) and store a pending record
 * @param user_id - discord user id
 * @param guild_id - discord guild id
 * @returns suggestion uuid for the web form link
 */
export async function generate_suggestion_token(user_id: string, guild_id: string): Promise<string> {
  const id = randomUUID()

  const data: suggestion_data = {
    id,
    user_id,
    guild_id,
    suggest_type        : "add_new_feature",
    game_name           : null,
    game_id             : null,
    game_image          : null,
    feature_description : "",
    reason              : null,
    status              : "pending",
    discord_message_id  : null,
    created_at          : Math.floor(Date.now() / 1000),
  }

  await create_suggestion(data)
  return id
}

/**
 * @description get the web form url for a suggestion
 * @param id - suggestion uuid
 * @returns full url string
 */
export function get_suggestion_url(id: string): string {
  return `${__web_url}/suggest-feature?token=${id}`
}

/**
 * @description get the web detail url for a suggestion
 * @param id - suggestion uuid
 * @returns full url string
 */
export function get_suggestion_detail_url(id: string): string {
  return `${__web_url}/suggested-feature/${id}`
}

/**
 * @description build the suggestion announcement message for the discord channel
 * @param suggestion - suggestion data
 * @param vote_count - current vote count
 * @returns component v2 message payload
 */
export function build_suggestion_message(suggestion: suggestion_data, vote_count: number) {
  const type_label = suggestion.suggest_type === "add_game_support"
    ? "Add Game Support"
    : "Add New Feature"

  const body_lines = [
    `- User: <@${suggestion.user_id}>`,
    `- Type: ${type_label}`,
  ]

  if (suggestion.game_name) {
    body_lines.push(`- Game: ${suggestion.game_name}`)
  }

  body_lines.push(
    `- Suggestion:`,
    `> ${suggestion.feature_description}`,
  )

  return component.build_message({
    components: [
      component.container({
        components: [
          component.text("## New Suggestion !\n"),
        ],
      }),
      component.container({
        components: [
          component.text(body_lines),
        ],
      }),
      component.container({
        components: [
          component.text(`Current Status: ${suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}\n`),
          component.action_row(
            component.secondary_button("Suggest a Feature", "suggest_feature"),
            component.success_button(`Upvote (${vote_count})`, `${__btn_suggest_upvote}${suggestion.id}`),
            component.link_button("Detailed ( Redirect to Web )", get_suggestion_detail_url(suggestion.id)),
          ),
        ],
      }),
    ],
  })
}

/**
 * @description post the suggestion to the suggestion channel and update the message id
 * @param client - discord client
 * @param suggestion - suggestion data
 * @returns void
 */
export async function post_suggestion_to_channel(client: Client, suggestion: suggestion_data): Promise<void> {
  try {
    if (!__suggestion_channel_id) {
      console.log("[ - SUGGEST FEATURE - ] suggestion channel id is not set")
      return
    }

    const channel = await client.channels.fetch(__suggestion_channel_id).catch(() => null)

    if (!channel || !(channel instanceof TextChannel)) {
      console.log("[ - SUGGEST FEATURE - ] suggestion channel not found or not a text channel")
      return
    }

    const vote_count = await get_vote_count(suggestion.id)
    const message    = await channel.send(build_suggestion_message(suggestion, vote_count))

    await update_suggestion(suggestion.id, { discord_message_id: message.id })
  } catch (err) {
    await log_error(client, err as Error, "Suggest Feature - Post to Channel", {
      suggestion_id: suggestion.id,
    }).catch(() => {})
  }
}

/**
 * @description handle upvote toggle from discord button
 * @param client - discord client
 * @param suggestion_id - suggestion uuid
 * @param user_id - voter discord id
 * @returns object with success status and voted state
 */
export async function handle_upvote(
  client        : Client,
  suggestion_id : string,
  user_id       : string,
): Promise<{ success: boolean; voted: boolean; vote_count: number; error?: string }> {
  try {
    const suggestion = await find_suggestion(suggestion_id)

    if (!suggestion) {
      return { success: false, voted: false, vote_count: 0, error: "Suggestion not found" }
    }

    const already_voted = await has_voted(suggestion_id, user_id)

    if (already_voted) {
      await remove_vote(suggestion_id, user_id)
    } else {
      await upsert_vote(suggestion_id, user_id, "discord")
    }

    const vote_count = await get_vote_count(suggestion_id)

    return { success: true, voted: !already_voted, vote_count }
  } catch (err) {
    await log_error(client, err as Error, "Suggest Feature - Handle Upvote", {
      suggestion_id,
      user_id,
    }).catch(() => {})

    return { success: false, voted: false, vote_count: 0, error: "Failed to process vote" }
  }
}

/**
 * @description update the discord message vote count after a vote change
 * @param client - discord client
 * @param suggestion - suggestion data with discord_message_id
 * @param vote_count - new vote count
 * @returns void
 */
export async function update_vote_message(
  client      : Client,
  suggestion  : suggestion_data,
  vote_count  : number,
): Promise<void> {
  try {
    if (!suggestion.discord_message_id || !__suggestion_channel_id) return

    const channel = await client.channels.fetch(__suggestion_channel_id).catch(() => null)

    if (!channel || !(channel instanceof TextChannel)) return

    const message = await channel.messages.fetch(suggestion.discord_message_id).catch(() => null)

    if (!message) return

    await message.edit(build_suggestion_message(suggestion, vote_count))
  } catch (err) {
    await log_error(client, err as Error, "Suggest Feature - Update Vote Message", {
      suggestion_id: suggestion.id,
    }).catch(() => {})
  }
}
