/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 建议同步 API 路由，Web → Bot 通道消息同步 - \\
// - suggestion sync api routes, web → bot channel message sync - \\
import { Router, Request, Response } from "express"
import { Client }                    from "discord.js"
import { log_error }                 from "@utils/error_logger"
import { find_suggestion }           from "@managers/suggestion.manager"
import { get_vote_count }            from "@managers/suggestion.manager"
import {
  post_suggestion_to_channel,
  update_vote_message,
}                                    from "@commands/server-util/suggest-feature/controller/suggest_feature.controller"

/**
 * @description create suggestion sync API router
 * @param client - discord client instance
 * @returns Express Router
 */
export function create_suggestion_router(client: Client): Router {
  const router = Router()

  /**
   * @route POST /api/suggestion/notify
   * @description called by web after a suggestion form is submitted — posts message to discord channel
   */
  router.post("/suggestion/notify", async (req: Request, res: Response) => {
    try {
      const { suggestion_id } = req.body

      if (!suggestion_id) {
        res.status(400).json({ error: "Missing suggestion_id" })
        return
      }

      const suggestion = await find_suggestion(suggestion_id)

      if (!suggestion) {
        res.status(404).json({ error: "Suggestion not found" })
        return
      }

      if (!suggestion.feature_description || suggestion.feature_description.length === 0) {
        res.status(400).json({ error: "Suggestion has no content yet" })
        return
      }

      await post_suggestion_to_channel(client, suggestion)

      res.json({ success: true })
    } catch (err) {
      await log_error(client, err as Error, "Suggestion Notify API", {}).catch(() => {})
      res.status(500).json({ error: "Internal server error" })
    }
  })

  /**
   * @route POST /api/suggestion/vote-sync
   * @description called by web after a vote — updates the discord message vote count
   */
  router.post("/suggestion/vote-sync", async (req: Request, res: Response) => {
    try {
      const { suggestion_id, vote_count } = req.body

      if (!suggestion_id) {
        res.status(400).json({ error: "Missing suggestion_id" })
        return
      }

      const suggestion = await find_suggestion(suggestion_id)

      if (!suggestion) {
        res.status(404).json({ error: "Suggestion not found" })
        return
      }

      const actual_count = vote_count ?? await get_vote_count(suggestion_id)

      await update_vote_message(client, suggestion, actual_count)

      res.json({ success: true })
    } catch (err) {
      await log_error(client, err as Error, "Suggestion Vote Sync API", {}).catch(() => {})
      res.status(500).json({ error: "Internal server error" })
    }
  })

  return router
}
