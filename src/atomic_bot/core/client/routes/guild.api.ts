// - 服务器信息和审计日志的 API 路由 - \
// - guild info and audit log API router - \
import { Router, Request, Response } from "express"
import { Client, ChannelType }       from "discord.js"

/**
 * @description Create guild & audit log API router
 * @param client   - Discord client instance
 * @param guild_id - Main guild ID
 * @returns Express Router
 */
export function create_guild_router(client: Client | null, guild_id: string): Router {
  const router = Router()

  // - GET /api/roles - \\
  router.get("/roles", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) return res.status(503).json({ error: "Bot not ready" })

      const guild = client.guilds.cache.get(guild_id)
      if (!guild) return res.status(404).json({ error: "Main guild not found" })

      const roles = guild.roles.cache
        .filter(r => r.name !== "@everyone")
        .sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position }))

      res.status(200).json({ roles })
    } catch (err) {
      console.error("[ - API ROLES - ] Error:", err)
      res.status(500).json({ error: "Failed to get roles" })
    }
  })

  // - GET /api/audit-logs - \\
  router.get("/audit-logs", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) return res.status(503).json({ error: "Bot not ready" })

      const guild = client.guilds.cache.get(guild_id)
      if (!guild) return res.status(404).json({ error: "Main guild not found" })

      const audit_logs = await guild.fetchAuditLogs({ limit: 15 })

      const logs = audit_logs.entries.map(entry => {
        const target_user    = entry.target && "username" in entry.target ? entry.target : null
        const target_role    = entry.target && "name" in entry.target && !("username" in entry.target) ? entry.target : null
        const target_channel = entry.target && "name" in entry.target && "type" in entry.target ? entry.target : null

        let target_name = ""
        let target_id   = ""

        if (target_user) {
          target_name = (target_user as { username?: string }).username || ""
          target_id   = (target_user as { id?: string }).id || ""
        } else if (target_role) {
          target_name = (target_role as { name: string }).name || ""
          target_id   = (target_role as { id: string }).id || ""
        } else if (target_channel) {
          target_name = (target_channel as { name: string }).name || ""
          target_id   = (target_channel as { id: string }).id || ""
        } else if (entry.target) {
          target_name = entry.target.toString()
          target_id   = entry.targetId || ""
        }

        const changes: any[] = entry.changes?.map(c => ({
          key : c.key,
          old : c.old ? String(c.old) : undefined,
          new : c.new ? String(c.new) : undefined,
        })) || []

        if (entry.action === 25 && entry.changes) {
          entry.changes
            .filter(c => c.key === "$add" || c.key === "$remove")
            .forEach(c => {
              const roles = c.new as { name: string }[] | undefined
              if (roles && Array.isArray(roles)) {
                roles.forEach(r => changes.push({
                  key : c.key === "$add" ? "role_add" : "role_remove",
                  old : c.key === "$remove" ? r.name : undefined,
                  new : c.key === "$add"    ? r.name : undefined,
                }))
              }
            })
        }

        return {
          id          : entry.id,
          action      : entry.action.toString(),
          action_type : entry.action,
          user        : entry.executor?.username || "Unknown",
          user_id     : entry.executor?.id || "",
          target      : target_name,
          target_id,
          channel     : null,
          channel_id  : null,
          changes,
          timestamp   : entry.createdAt.toISOString(),
        }
      })

      res.status(200).json({ logs })
    } catch (err) {
      console.error("[ - API AUDIT LOGS - ] Error:", err)
      res.status(500).json({ error: "Failed to get audit logs" })
    }
  })

  // - GET /api/guild/:guild_id/channels - \\
  router.get("/guild/:guild_id/channels", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) return res.status(503).json({ error: "Bot not ready" })

      const g = client.guilds.cache.get(req.params.guild_id)
      if (!g) return res.status(404).json({ error: "Guild not found" })

      const channels   = g.channels.cache
        .filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildCategory)
        .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
        .map(c => ({
          id        : c.id,
          name      : c.name,
          type      : c.type as number,
          parent_id : c.parentId ?? null,
          position  : c.rawPosition ?? 0,
        }))

      const categories = g.channels.cache
        .filter(c => c.type === ChannelType.GuildCategory)
        .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
        .map(c => ({ id: c.id, name: c.name }))

      res.status(200).json({ channels, categories })
    } catch (err) {
      console.error("[ - API GUILD CHANNELS - ] Error:", err)
      res.status(500).json({ error: "Failed to get channels" })
    }
  })

  // - GET /api/guild/:guild_id/roles - \\
  router.get("/guild/:guild_id/roles", async (req: Request, res: Response) => {
    try {
      if (!client?.isReady()) return res.status(503).json({ error: "Bot not ready" })

      const g = client.guilds.cache.get(req.params.guild_id)
      if (!g) return res.status(404).json({ error: "Guild not found" })

      const roles = g.roles.cache
        .filter(r => r.name !== "@everyone" && !r.managed)
        .sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name, color: r.color, position: r.position }))

      res.status(200).json({ roles })
    } catch (err) {
      console.error("[ - API GUILD ROLES - ] Error:", err)
      res.status(500).json({ error: "Failed to get roles" })
    }
  })

  // - GET /api/guild/:guild_id/status - \\
  router.get("/guild/:guild_id/status", (req: Request, res: Response) => {
    const in_guild = client?.isReady()
      ? client.guilds.cache.has(req.params.guild_id)
      : false

    res.status(200).json({ in_guild })
  })

  return router
}
