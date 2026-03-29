/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 反应身份组的 CRUD API 路由 - \
// - reaction roles CRUD API router - \
import { Router, Request, Response } from "express"
import * as database                 from "@shared/utils/database"

/**
 * @description create reaction roles CRUD API router
 * @param guild_id - Main guild ID
 * @returns Express Router
 */
export function create_reaction_roles_router(guild_id: string): Router {
  const router = Router()

  router.get("/reaction-roles", async (req: Request, res: Response) => {
    try {
      const configs = await database.find_many("reaction_roles", { guild_id })
      res.status(200).json({ configs })
    } catch (err) {
      console.error("[ - API REACTION ROLES - ] Error:", err)
      res.status(500).json({ error: "Failed to get reaction roles" })
    }
  })

  router.post("/reaction-roles", async (req: Request, res: Response) => {
    try {
      const { title, description, buttons } = req.body
      if (!title || !buttons || buttons.length === 0) {
        return res.status(400).json({ error: "Title and at least one button are required" })
      }

      const id = await database.insert_one("reaction_roles", {
        guild_id,
        title,
        description : description || "",
        buttons,
        enabled    : true,
        created_at : new Date().toISOString(),
      })

      console.log(`[ - REACTION ROLES - ] Created: ${title}`)
      res.status(201).json({ success: true, id })
    } catch (err) {
      console.error("[ - API REACTION ROLES - ] Error:", err)
      res.status(500).json({ error: "Failed to create reaction role" })
    }
  })

  router.put("/reaction-roles/:id", async (req: Request, res: Response) => {
    try {
      const { title, description, buttons } = req.body
      const updated = await database.update_one("reaction_roles",
        { id: parseInt(req.params.id) },
        { title, description: description || "", buttons, updated_at: new Date().toISOString() }
      )

      if (!updated) return res.status(404).json({ error: "Reaction role config not found" })
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API REACTION ROLES - ] Error:", err)
      res.status(500).json({ error: "Failed to update reaction role" })
    }
  })

  router.delete("/reaction-roles/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await database.delete_one("reaction_roles", { id: parseInt(req.params.id) })
      if (!deleted) return res.status(404).json({ error: "Reaction role config not found" })
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API REACTION ROLES - ] Error:", err)
      res.status(500).json({ error: "Failed to delete reaction role" })
    }
  })

  return router
}
