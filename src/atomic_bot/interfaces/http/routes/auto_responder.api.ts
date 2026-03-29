/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 自动回复的 CRUD API 路由，增删改查都在这 - \
// - auto-responder CRUD API router, all the create/read/update/delete stuff lives here - \
import { Router, Request, Response } from "express"
import * as database                 from "@shared/utils/database"

/**
 * @description create auto-responder CRUD API router
 * @param guild_id - Main guild ID
 * @returns Express Router
 */
export function create_auto_responder_router(guild_id: string): Router {
  const router = Router()

  router.get("/auto-responder", async (req: Request, res: Response) => {
    try {
      const responses = await database.find_many("auto_responder", { guild_id })
      res.status(200).json({ responses })
    } catch (err) {
      console.error("[ - API AUTO RESPONDER - ] Error:", err)
      res.status(500).json({ error: "Failed to get auto responses" })
    }
  })

  router.post("/auto-responder", async (req: Request, res: Response) => {
    try {
      const { trigger, response, match_type } = req.body
      if (!trigger || !response) return res.status(400).json({ error: "Trigger and response are required" })

      const id = await database.insert_one("auto_responder", {
        guild_id,
        trigger    : trigger.toLowerCase(),
        response,
        match_type : match_type || "contains",
        enabled    : true,
        created_at : new Date().toISOString(),
      })

      console.log(`[ - AUTO RESPONDER - ] Created: ${trigger}`)
      res.status(201).json({ success: true, id })
    } catch (err) {
      console.error("[ - API AUTO RESPONDER - ] Error:", err)
      res.status(500).json({ error: "Failed to create auto response" })
    }
  })

  router.put("/auto-responder/:id", async (req: Request, res: Response) => {
    try {
      const { trigger, response, match_type } = req.body
      const updated = await database.update_one("auto_responder",
        { id: parseInt(req.params.id) },
        { trigger: trigger.toLowerCase(), response, match_type: match_type || "contains" }
      )

      if (!updated) return res.status(404).json({ error: "Auto response not found" })
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API AUTO RESPONDER - ] Error:", err)
      res.status(500).json({ error: "Failed to update auto response" })
    }
  })

  router.patch("/auto-responder/:id/toggle", async (req: Request, res: Response) => {
    try {
      const { enabled } = req.body
      const updated = await database.update_one("auto_responder",
        { id: parseInt(req.params.id) },
        { enabled }
      )

      if (!updated) return res.status(404).json({ error: "Auto response not found" })
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API AUTO RESPONDER - ] Error:", err)
      res.status(500).json({ error: "Failed to toggle auto response" })
    }
  })

  router.delete("/auto-responder/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await database.delete_one("auto_responder", { id: parseInt(req.params.id) })
      if (!deleted) return res.status(404).json({ error: "Auto response not found" })
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API AUTO RESPONDER - ] Error:", err)
      res.status(500).json({ error: "Failed to delete auto response" })
    }
  })

  return router
}
