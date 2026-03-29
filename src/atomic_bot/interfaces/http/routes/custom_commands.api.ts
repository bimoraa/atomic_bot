/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 自定义指令的 CRUD API 路由 - \
// - custom commands CRUD API router - \
import { Router, Request, Response } from "express"
import * as database                 from "@shared/utils/database"

/**
 * @description create custom commands CRUD API router
 * @param guild_id - Main guild ID
 * @returns Express Router
 */
export function create_custom_commands_router(guild_id: string): Router {
  const router = Router()

  router.get("/custom-commands", async (req: Request, res: Response) => {
    try {
      const commands = await database.find_many("custom_commands", { guild_id })
      res.status(200).json({ commands })
    } catch (err) {
      console.error("[ - API CUSTOM COMMANDS - ] Error:", err)
      res.status(500).json({ error: "Failed to get custom commands" })
    }
  })

  router.post("/custom-commands", async (req: Request, res: Response) => {
    try {
      const { name, description, response } = req.body
      if (!name || !response) return res.status(400).json({ error: "Name and response are required" })

      const existing = await database.find_one("custom_commands", { guild_id, name: name.toLowerCase() })
      if (existing) return res.status(400).json({ error: "Command with this name already exists" })

      const id = await database.insert_one("custom_commands", {
        guild_id,
        name        : name.toLowerCase(),
        description : description || "",
        response,
        enabled    : true,
        created_at : new Date().toISOString(),
      })

      console.log(`[ - CUSTOM COMMANDS - ] Created: ${name}`)
      res.status(201).json({ success: true, id })
    } catch (err) {
      console.error("[ - API CUSTOM COMMANDS - ] Error:", err)
      res.status(500).json({ error: "Failed to create custom command" })
    }
  })

  router.put("/custom-commands/:id", async (req: Request, res: Response) => {
    try {
      const { name, description, response } = req.body
      const updated = await database.update_one("custom_commands",
        { id: parseInt(req.params.id) },
        { name: name.toLowerCase(), description: description || "", response, updated_at: new Date().toISOString() }
      )

      if (!updated) return res.status(404).json({ error: "Custom command not found" })
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API CUSTOM COMMANDS - ] Error:", err)
      res.status(500).json({ error: "Failed to update custom command" })
    }
  })

  router.patch("/custom-commands/:id/toggle", async (req: Request, res: Response) => {
    try {
      const { enabled } = req.body
      const updated = await database.update_one("custom_commands",
        { id: parseInt(req.params.id) },
        { enabled }
      )

      if (!updated) return res.status(404).json({ error: "Custom command not found" })
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API CUSTOM COMMANDS - ] Error:", err)
      res.status(500).json({ error: "Failed to toggle custom command" })
    }
  })

  router.delete("/custom-commands/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await database.delete_one("custom_commands", { id: parseInt(req.params.id) })
      if (!deleted) return res.status(404).json({ error: "Custom command not found" })
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API CUSTOM COMMANDS - ] Error:", err)
      res.status(500).json({ error: "Failed to delete custom command" })
    }
  })

  return router
}
