import express, { Request, Response }   from "express"
import { Client, ChannelType }          from "discord.js"
import { handle_github_webhook }        from "../../infrastructure/webhooks/github"
import cors                             from "cors"
import * as database                    from "@shared/utils/database"

const port       = parseInt(process.env.PORT || process.env.WEBHOOK_PORT || "3456", 10)
const public_url = process.env.PUBLIC_URL || `http://localhost:${port}`
const main_guild_id = process.env.MAIN_GUILD_ID || "1250337227582472243"

let bot_ready = false
let discord_client: Client | null = null

/**
 * @description Set bot ready status for health checks
 * @param ready - Boolean indicating if bot is ready
 * @returns void
 */
export function set_bot_ready(ready: boolean): void {
  bot_ready = ready
  if (ready) {
    console.log("[ - SERVER - ] Bot marked as ready for health checks")
  }
}

// - MEMBER CACHE - \\
const member_cache = new Map<string, { data: any; timestamp: number }>()
const cache_ttl = 5 * 60 * 1000 // - 5 minutes - \\

/**
 * @description Start Express HTTP server for Railway deployment
 * @param client - Discord client instance
 * @returns void
 */
export function start_webhook_server(client: Client): void {
  discord_client = client
  bot_ready      = false
  
  const app = express()

  // - TRUST PROXY FOR RAILWAY - \\
  app.set("trust proxy", 1)
  app.disable("x-powered-by")

  app.use(cors({
    origin     : process.env.DASHBOARD_URL || "http://localhost:3000",
    credentials: true,
  }))
  app.use(express.json({ limit: "10mb" }))
  app.use(express.urlencoded({ extended: true, limit: "10mb" }))

  // - RAILWAY KEEPALIVE MIDDLEWARE - \\
  app.use((req: Request, res: Response, next) => {
    res.setHeader("Connection", "keep-alive")
    res.setHeader("Keep-Alive", "timeout=120")
    next()
  })

  app.post("/webhook/github", async (req: Request, res: Response) => {
    try {
      console.log("[ - WEBHOOK - ] Received webhook request")
      const event = req.headers["x-github-event"] as string
      
      if (event === "push") {
        console.log("[ - WEBHOOK - ] Processing push event")
        if (discord_client) {
          await handle_github_webhook(req.body, discord_client)
        }
      }

      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - WEBHOOK - ] Error:", err)
      res.status(500).json({ error: "Internal server error" })
    }
  })

  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      if (!discord_client?.isReady()) {
        return res.status(503).json({ error: "Bot not ready" })
      }

      const guilds   = discord_client.guilds.cache.size
      const users    = discord_client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
      const channels = discord_client.channels.cache.size
      
      res.status(200).json({
        guilds,
        users,
        channels,
        uptime    : process.uptime(),
        memory    : process.memoryUsage(),
        timestamp : new Date().toISOString(),
      })
    } catch (err) {
      console.error("[ - API STATS - ] Error:", err)
      res.status(500).json({ error: "Failed to get stats" })
    }
  })

  app.get("/api/guilds", async (req: Request, res: Response) => {
    try {
      if (!discord_client?.isReady()) {
        return res.status(503).json({ error: "Bot not ready" })
      }

      const guilds = discord_client.guilds.cache.map(guild => ({
        id           : guild.id,
        name         : guild.name,
        icon         : guild.iconURL(),
        member_count : guild.memberCount,
        owner_id     : guild.ownerId,
      }))

      res.status(200).json({ guilds })
    } catch (err) {
      console.error("[ - API GUILDS - ] Error:", err)
      res.status(500).json({ error: "Failed to get guilds" })
    }
  })

  // - GET USER INFO BY ID - \\
  /**
   * @route GET /api/user/:id
   * @param id - Discord user ID
   * @returns User info (username, tag, avatar)
   */
  app.get("/api/user/:id", async (req: Request, res: Response) => {
    try {
      if (!discord_client?.isReady()) {
        return res.status(503).json({ error: "Bot not ready" })
      }

      const user_id = req.params.id
      const user = await discord_client.users.fetch(user_id).catch(() => null)

      if (!user) {
        return res.status(404).json({ error: "User not found" })
      }

      res.status(200).json({
        id       : user.id,
        username : user.username,
        tag      : user.tag,
        avatar   : user.displayAvatarURL({ size: 128 }),
        bot      : user.bot,
      })
    } catch (err) {
      console.error("[ - API USER - ] Error:", err)
      res.status(500).json({ error: "Failed to get user" })
    }
  })

  // - GET CHANNEL INFO BY ID - \\
  /**
   * @route GET /api/channel/:id
   * @param id - Discord channel ID
   * @returns Channel info (name, type, etc.)
   */
  app.get("/api/channel/:id", async (req: Request, res: Response) => {
    try {
      if (!discord_client?.isReady()) {
        return res.status(503).json({ error: "Bot not ready" })
      }

      const channel_id = req.params.id
      const channel = await discord_client.channels.fetch(channel_id).catch(() => null)

      if (!channel) {
        return res.status(404).json({ error: "Channel not found" })
      }

      const response: any = {
        id   : channel.id,
        type : channel.type,
      }

      if ('name' in channel && channel.name) {
        response.name = channel.name
      }

      if ('parent' in channel && channel.parent) {
        response.parent = {
          id   : channel.parent.id,
          name : channel.parent.name,
        }
      }

      res.status(200).json(response)
    } catch (err) {
      console.error("[ - API CHANNEL - ] Error:", err)
      res.status(500).json({ error: "Failed to get channel" })
    }
  })

  // - GET MEMBER INFO BY ID - \\
  /**
   * @route GET /api/member/:id
   * @param id - Discord user ID
   * @returns Member info including roles, join date, etc.
   */
  app.get("/api/member/:id", async (req: Request, res: Response) => {
    try {
      if (!discord_client?.isReady()) {
        return res.status(503).json({ error: "Bot not ready" })
      }

      const user_id = req.params.id
      
      // - CHECK CACHE - \\
      const cached = member_cache.get(user_id)
      if (cached && Date.now() - cached.timestamp < cache_ttl) {
        console.log(`[ - API MEMBER - ] Cache hit for ${user_id}`)
        return res.status(200).json(cached.data)
      }

      const guild = discord_client.guilds.cache.get(main_guild_id)
      
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" })
      }

      const member = await guild.members.fetch(user_id).catch(() => null)
      
      if (!member) {
        return res.status(404).json({ error: "Member not found" })
      }

      const roles = member.roles.cache
        .filter(r => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => ({
          id: r.id,
          name: r.name,
          color: r.hexColor,
          icon: r.iconURL({ size: 64 }) || r.icon || null,
          position: r.position
        }))

      // - Fetch full user for banner - \\
      const full_user = await discord_client.users.fetch(user_id, { force: true }).catch(() => null)

      const response_data = {
        id           : member.id,
        username     : member.user.username,
        tag          : member.user.tag,
        avatar       : member.user.displayAvatarURL({ size: 256 }),
        banner       : full_user?.bannerURL({ size: 512 }) || null,
        display_name : member.displayName,
        nickname     : member.nickname,
        bot          : member.user.bot,
        roles        : roles,
        joined_at    : member.joinedTimestamp,
        created_at   : member.user.createdTimestamp,
        premium_since: member.premiumSinceTimestamp,
      }

      // - SAVE TO CACHE - \\
      member_cache.set(user_id, {
        data     : response_data,
        timestamp: Date.now()
      })
      console.log(`[ - API MEMBER - ] Cached ${user_id}`)

      res.status(200).json(response_data)
    } catch (err) {
      console.error("[ - API MEMBER - ] Error:", err)
      res.status(500).json({ error: "Failed to get member" })
    }
  })

  app.get("/api/server-info", async (req: Request, res: Response) => {
    try {
      if (!discord_client?.isReady()) {
        return res.status(503).json({ error: "Bot not ready" })
      }

      const guild = discord_client.guilds.cache.get(main_guild_id)
      if (!guild) {
        return res.status(404).json({ error: "Main guild not found" })
      }

      const channels = guild.channels.cache
      const voice_channels = channels.filter(c => c.type === ChannelType.GuildVoice).size
      const text_channels  = channels.filter(c => c.type === ChannelType.GuildText).size
      const categories     = channels.filter(c => c.type === ChannelType.GuildCategory).size

      res.status(200).json({
        server_name    : guild.name,
        server_icon    : guild.iconURL({ size: 128 }),
        total_members  : guild.memberCount,
        voice_channels,
        text_channels,
        categories,
        roles          : guild.roles.cache.size,
      })
    } catch (err) {
      console.error("[ - API SERVER INFO - ] Error:", err)
      res.status(500).json({ error: "Failed to get server info" })
    }
  })

  app.get("/api/bot-info", async (req: Request, res: Response) => {
    try {
      if (!discord_client?.isReady()) {
        return res.status(503).json({ error: "Bot not ready" })
      }

      const guild = discord_client.guilds.cache.get(main_guild_id)
      const bot_member = guild?.members.cache.get(discord_client.user?.id || "")
      
      const uptime_seconds = process.uptime()
      const hours   = Math.floor(uptime_seconds / 3600)
      const minutes = Math.floor((uptime_seconds % 3600) / 60)

      res.status(200).json({
        nickname : bot_member?.nickname || discord_client.user?.username || "Atomic Bot",
        status   : "Online",
        uptime   : `${hours}h ${minutes}m`,
        ping     : discord_client.ws.ping,
      })
    } catch (err) {
      console.error("[ - API BOT INFO - ] Error:", err)
      res.status(500).json({ error: "Failed to get bot info" })
    }
  })

  app.post("/api/bot-nickname", async (req: Request, res: Response) => {
    try {
      if (!discord_client?.isReady()) {
        return res.status(503).json({ error: "Bot not ready" })
      }

      const { nickname } = req.body
      const guild = discord_client.guilds.cache.get(main_guild_id)
      
      if (!guild) {
        return res.status(404).json({ error: "Main guild not found" })
      }

      const bot_member = guild.members.cache.get(discord_client.user?.id || "")
      if (bot_member) {
        await bot_member.setNickname(nickname || null)
        console.log(`[ - API BOT NICKNAME - ] Updated to: ${nickname}`)
      }

      res.status(200).json({ success: true, nickname })
    } catch (err) {
      console.error("[ - API BOT NICKNAME - ] Error:", err)
      res.status(500).json({ error: "Failed to update nickname" })
    }
  })

  app.get("/api/audit-logs", async (req: Request, res: Response) => {
    try {
      if (!discord_client?.isReady()) {
        return res.status(503).json({ error: "Bot not ready" })
      }

      const guild = discord_client.guilds.cache.get(main_guild_id)
      if (!guild) {
        return res.status(404).json({ error: "Main guild not found" })
      }

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

        const changes: any[] = entry.changes?.map(change => ({
          key : change.key,
          old : change.old ? String(change.old) : undefined,
          new : change.new ? String(change.new) : undefined,
        })) || []

        if (entry.action === 25 && entry.changes) {
          const role_changes = entry.changes.filter(c => c.key === "$add" || c.key === "$remove")
          role_changes.forEach(change => {
            const roles = change.new as { name: string }[] | undefined
            if (roles && Array.isArray(roles)) {
              roles.forEach(role => {
                changes.push({
                  key : change.key === "$add" ? "role_add" : "role_remove",
                  old : change.key === "$remove" ? role.name : undefined,
                  new : change.key === "$add" ? role.name : undefined,
                })
              })
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
          target_id   : target_id,
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

  app.get("/api/auto-responder", async (req: Request, res: Response) => {
    try {
      const responses = await database.find_many("auto_responder", {
        guild_id: main_guild_id,
      })
      
      res.status(200).json({ responses })
    } catch (err) {
      console.error("[ - API AUTO RESPONDER - ] Error:", err)
      res.status(500).json({ error: "Failed to get auto responses" })
    }
  })

  app.post("/api/auto-responder", async (req: Request, res: Response) => {
    try {
      const { trigger, response, match_type } = req.body
      
      if (!trigger || !response) {
        return res.status(400).json({ error: "Trigger and response are required" })
      }

      const doc = {
        guild_id   : main_guild_id,
        trigger    : trigger.toLowerCase(),
        response,
        match_type : match_type || "contains",
        enabled    : true,
        created_at : new Date().toISOString(),
      }

      const id = await database.insert_one("auto_responder", doc)
      console.log(`[ - AUTO RESPONDER - ] Created: ${trigger}`)
      
      res.status(201).json({ success: true, id })
    } catch (err) {
      console.error("[ - API AUTO RESPONDER - ] Error:", err)
      res.status(500).json({ error: "Failed to create auto response" })
    }
  })

  app.put("/api/auto-responder/:id", async (req: Request, res: Response) => {
    try {
      const { id }                            = req.params
      const { trigger, response, match_type } = req.body
      
      const updated = await database.update_one("auto_responder", 
        { id: parseInt(id) },
        { 
          trigger    : trigger.toLowerCase(),
          response,
          match_type : match_type || "contains",
        }
      )

      if (!updated) {
        return res.status(404).json({ error: "Auto response not found" })
      }

      console.log(`[ - AUTO RESPONDER - ] Updated: ${trigger}`)
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API AUTO RESPONDER - ] Error:", err)
      res.status(500).json({ error: "Failed to update auto response" })
    }
  })

  app.patch("/api/auto-responder/:id/toggle", async (req: Request, res: Response) => {
    try {
      const { id }      = req.params
      const { enabled } = req.body
      
      const updated = await database.update_one("auto_responder", 
        { id: parseInt(id) },
        { enabled }
      )

      if (!updated) {
        return res.status(404).json({ error: "Auto response not found" })
      }

      console.log(`[ - AUTO RESPONDER - ] Toggled: ${id} -> ${enabled}`)
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API AUTO RESPONDER - ] Error:", err)
      res.status(500).json({ error: "Failed to toggle auto response" })
    }
  })

  app.delete("/api/auto-responder/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      
      const deleted = await database.delete_one("auto_responder", { 
        id: parseInt(id) 
      })

      if (!deleted) {
        return res.status(404).json({ error: "Auto response not found" })
      }

      console.log(`[ - AUTO RESPONDER - ] Deleted: ${id}`)
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API AUTO RESPONDER - ] Error:", err)
      res.status(500).json({ error: "Failed to delete auto response" })
    }
  })

  app.get("/api/bot-settings", async (req: Request, res: Response) => {
    try {
      const settings = await database.find_one<{
        status        : string
        activity_type : string
        activity_text : string
      }>("bot_settings", {
        guild_id: main_guild_id,
      })
      
      res.status(200).json({
        status        : settings?.status || "online",
        activity_type : settings?.activity_type || "Playing",
        activity_text : settings?.activity_text || "",
      })
    } catch (err) {
      console.error("[ - API BOT SETTINGS - ] Error:", err)
      res.status(500).json({ error: "Failed to get bot settings" })
    }
  })

  app.put("/api/bot-settings", async (req: Request, res: Response) => {
    try {
      if (!discord_client?.isReady()) {
        return res.status(503).json({ error: "Bot not ready" })
      }

      const { status, activity_type, activity_text } = req.body
      
      await database.update_one("bot_settings", 
        { guild_id: main_guild_id },
        { 
          guild_id      : main_guild_id,
          status,
          activity_type,
          activity_text,
          updated_at    : new Date().toISOString(),
        },
        true
      )

      const activity_map: Record<string, number> = {
        "Playing"   : 0,
        "Streaming" : 1,
        "Listening" : 2,
        "Watching"  : 3,
        "Competing" : 5,
      }

      const status_map: Record<string, "online" | "idle" | "dnd" | "invisible"> = {
        "online"    : "online",
        "idle"      : "idle",
        "dnd"       : "dnd",
        "invisible" : "invisible",
      }

      discord_client.user?.setPresence({
        status     : status_map[status] || "online",
        activities : activity_text ? [{
          name : activity_text,
          type : activity_map[activity_type] || 0,
        }] : [],
      })

      console.log(`[ - BOT SETTINGS - ] Updated: ${status} - ${activity_type} ${activity_text}`)
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API BOT SETTINGS - ] Error:", err)
      res.status(500).json({ error: "Failed to update bot settings" })
    }
  })

  app.get("/api/roles", async (req: Request, res: Response) => {
    try {
      if (!discord_client?.isReady()) {
        return res.status(503).json({ error: "Bot not ready" })
      }

      const guild = discord_client.guilds.cache.get(main_guild_id)
      if (!guild) {
        return res.status(404).json({ error: "Main guild not found" })
      }

      const roles = guild.roles.cache
        .filter(role => role.name !== "@everyone")
        .sort((a, b) => b.position - a.position)
        .map(role => ({
          id       : role.id,
          name     : role.name,
          color    : role.hexColor,
          position : role.position,
        }))

      res.status(200).json({ roles })
    } catch (err) {
      console.error("[ - API ROLES - ] Error:", err)
      res.status(500).json({ error: "Failed to get roles" })
    }
  })

  app.get("/api/reaction-roles", async (req: Request, res: Response) => {
    try {
      const configs = await database.find_many("reaction_roles", {
        guild_id: main_guild_id,
      })
      
      res.status(200).json({ configs })
    } catch (err) {
      console.error("[ - API REACTION ROLES - ] Error:", err)
      res.status(500).json({ error: "Failed to get reaction roles" })
    }
  })

  app.post("/api/reaction-roles", async (req: Request, res: Response) => {
    try {
      const { title, description, buttons } = req.body
      
      if (!title || !buttons || buttons.length === 0) {
        return res.status(400).json({ error: "Title and at least one button are required" })
      }

      const doc = {
        guild_id    : main_guild_id,
        title,
        description : description || "",
        buttons,
        enabled     : true,
        created_at  : new Date().toISOString(),
      }

      const id = await database.insert_one("reaction_roles", doc)
      console.log(`[ - REACTION ROLES - ] Created: ${title}`)
      
      res.status(201).json({ success: true, id })
    } catch (err) {
      console.error("[ - API REACTION ROLES - ] Error:", err)
      res.status(500).json({ error: "Failed to create reaction role" })
    }
  })

  app.put("/api/reaction-roles/:id", async (req: Request, res: Response) => {
    try {
      const { id }                          = req.params
      const { title, description, buttons } = req.body
      
      const updated = await database.update_one("reaction_roles", 
        { id: parseInt(id) },
        { 
          title,
          description : description || "",
          buttons,
          updated_at  : new Date().toISOString(),
        }
      )

      if (!updated) {
        return res.status(404).json({ error: "Reaction role config not found" })
      }

      console.log(`[ - REACTION ROLES - ] Updated: ${title}`)
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API REACTION ROLES - ] Error:", err)
      res.status(500).json({ error: "Failed to update reaction role" })
    }
  })

  app.delete("/api/reaction-roles/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      
      const deleted = await database.delete_one("reaction_roles", { 
        id: parseInt(id) 
      })

      if (!deleted) {
        return res.status(404).json({ error: "Reaction role config not found" })
      }

      console.log(`[ - REACTION ROLES - ] Deleted: ${id}`)
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API REACTION ROLES - ] Error:", err)
      res.status(500).json({ error: "Failed to delete reaction role" })
    }
  })

  app.get("/api/custom-commands", async (req: Request, res: Response) => {
    try {
      const commands = await database.find_many("custom_commands", {
        guild_id: main_guild_id,
      })
      
      res.status(200).json({ commands })
    } catch (err) {
      console.error("[ - API CUSTOM COMMANDS - ] Error:", err)
      res.status(500).json({ error: "Failed to get custom commands" })
    }
  })

  app.post("/api/custom-commands", async (req: Request, res: Response) => {
    try {
      const { name, description, response } = req.body
      
      if (!name || !response) {
        return res.status(400).json({ error: "Name and response are required" })
      }

      const existing = await database.find_one("custom_commands", {
        guild_id : main_guild_id,
        name     : name.toLowerCase(),
      })

      if (existing) {
        return res.status(400).json({ error: "Command with this name already exists" })
      }

      const doc = {
        guild_id    : main_guild_id,
        name        : name.toLowerCase(),
        description : description || "",
        response,
        enabled     : true,
        created_at  : new Date().toISOString(),
      }

      const id = await database.insert_one("custom_commands", doc)
      console.log(`[ - CUSTOM COMMANDS - ] Created: ${name}`)
      
      res.status(201).json({ success: true, id })
    } catch (err) {
      console.error("[ - API CUSTOM COMMANDS - ] Error:", err)
      res.status(500).json({ error: "Failed to create custom command" })
    }
  })

  app.put("/api/custom-commands/:id", async (req: Request, res: Response) => {
    try {
      const { id }                          = req.params
      const { name, description, response } = req.body
      
      const updated = await database.update_one("custom_commands", 
        { id: parseInt(id) },
        { 
          name        : name.toLowerCase(),
          description : description || "",
          response,
          updated_at  : new Date().toISOString(),
        }
      )

      if (!updated) {
        return res.status(404).json({ error: "Custom command not found" })
      }

      console.log(`[ - CUSTOM COMMANDS - ] Updated: ${name}`)
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API CUSTOM COMMANDS - ] Error:", err)
      res.status(500).json({ error: "Failed to update custom command" })
    }
  })

  app.patch("/api/custom-commands/:id/toggle", async (req: Request, res: Response) => {
    try {
      const { id }      = req.params
      const { enabled } = req.body
      
      const updated = await database.update_one("custom_commands", 
        { id: parseInt(id) },
        { enabled }
      )

      if (!updated) {
        return res.status(404).json({ error: "Custom command not found" })
      }

      console.log(`[ - CUSTOM COMMANDS - ] Toggled: ${id} -> ${enabled}`)
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API CUSTOM COMMANDS - ] Error:", err)
      res.status(500).json({ error: "Failed to toggle custom command" })
    }
  })

  app.delete("/api/custom-commands/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      
      const deleted = await database.delete_one("custom_commands", { 
        id: parseInt(id) 
      })

      if (!deleted) {
        return res.status(404).json({ error: "Custom command not found" })
      }

      console.log(`[ - CUSTOM COMMANDS - ] Deleted: ${id}`)
      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - API CUSTOM COMMANDS - ] Error:", err)
      res.status(500).json({ error: "Failed to delete custom command" })
    }
  })

  app.get("/api/activity-logs", async (req: Request, res: Response) => {
    try {
      const all_logs = await database.find_many("activity_logs", {
        guild_id: main_guild_id,
      })
      
      const logs = all_logs
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50)
      
      res.status(200).json({ logs })
    } catch (err) {
      console.error("[ - API ACTIVITY LOGS - ] Error:", err)
      res.status(500).json({ error: "Failed to get activity logs" })
    }
  })
  
  app.get("/health", (req: Request, res: Response) => {
    const is_ready = (discord_client?.isReady() && bot_ready) || false
    const status   = is_ready ? "alive" : "starting"
    
    res.status(is_ready ? 200 : 503).send(status)
  })

  app.get("/health/detailed", (req: Request, res: Response) => {
    const is_ready = (discord_client?.isReady() && bot_ready) || false
    const mem      = process.memoryUsage()
    
    res.status(is_ready ? 200 : 503).json({ 
      status      : is_ready ? "alive" : "starting",
      bot_ready   : is_ready,
      uptime      : process.uptime(),
      memory      : {
        rss        : `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
        heap_used  : `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heap_total : `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      },
      guilds      : discord_client?.guilds?.cache?.size || 0,
      ping        : discord_client?.ws?.ping || -1,
      timestamp   : new Date().toISOString(),
    })
  })

  // - GET ALL TRANSCRIPTS - \\
  /**
   * @route GET /api/transcripts
   * @description Get all transcripts from database
   */
  app.get("/api/transcripts", async (req: Request, res: Response) => {
    try {
      const auth_header = req.headers.authorization
      const expected_token = process.env.BOT_API_SECRET || 'dev-secret'

      if (!auth_header || auth_header !== `Bearer ${expected_token}`) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      const transcripts = await database.find_many_sorted<any>(
        'ticket_transcripts',
        {},
        'close_time',
        'DESC'
      )

      // - Helper function to fetch user with timeout - \\
      const fetch_user_with_timeout = async (user_id: string, timeout_ms = 2000): Promise<string | null> => {
        if (!discord_client) return null
        
        try {
          const timeout_promise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout_ms)
          )
          
          const fetch_promise = discord_client.users.fetch(user_id).then(u => u.username)
          
          return await Promise.race([fetch_promise, timeout_promise])
        } catch (error) {
          return null
        }
      }

      const formatted_transcripts = await Promise.all(transcripts.map(async (t: any) => {
        const [claimed_by_username, closed_by_username] = await Promise.all([
          t.claimed_by ? fetch_user_with_timeout(t.claimed_by) : Promise.resolve(null),
          t.closed_by ? fetch_user_with_timeout(t.closed_by) : Promise.resolve(null)
        ])

        return {
          transcript_id : t.transcript_id,
          ticket_id     : t.ticket_id,
          ticket_type   : t.ticket_type,
          owner_id      : t.owner_id,
          owner_tag     : t.owner_tag,
          owner_avatar  : t.owner_avatar,
          claimed_by    : claimed_by_username,
          claimed_by_id : t.claimed_by,
          closed_by     : closed_by_username,
          closed_by_id  : t.closed_by,
          issue_type    : t.issue_type,
          description   : t.description,
          message_count : t.messages?.length || 0,
          open_time     : t.open_time,
          close_time    : t.close_time,
          duration      : t.close_time - t.open_time,
        }
      }))

      res.status(200).json({
        total  : formatted_transcripts.length,
        transcripts: formatted_transcripts,
      })
    } catch (err) {
      console.error("[ - API TRANSCRIPTS - ] Error:", err)
      res.status(500).json({ error: "Failed to fetch transcripts" })
    }
  })

  app.get("/", (req: Request, res: Response) => {
    res.status(200).json({ 
      status    : "running",
      service   : "atomic_bot",
      bot_ready : discord_client?.isReady() || false,
      port,
      url       : public_url,
      endpoints : {
        health  : `${public_url}/health`,
        webhook : `${public_url}/webhook/github`,
        api     : {
          stats       : `${public_url}/api/stats`,
          guilds      : `${public_url}/api/guilds`,
          server_info : `${public_url}/api/server-info`,
          bot_info    : `${public_url}/api/bot-info`,
          audit_logs  : `${public_url}/api/audit-logs`,
        },
      },
    })
  })

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`[ - HTTP - ] Server listening on 0.0.0.0:${port}`)
    console.log(`[ - HTTP - ] Public URL: ${public_url}`)
    console.log(`[ - HTTP - ] Health endpoint: ${public_url}/health`)
    console.log(`[ - HTTP - ] Webhook endpoint: ${public_url}/webhook/github`)
  })

  server.on("error", (err: Error) => {
    console.error("[ - HTTP - ] Server error:", err)
    if ((err as any).code === "EADDRINUSE") {
      console.error(`[ - HTTP - ] Port ${port} is already in use`)
      process.exit(1)
    }
  })

  server.on("listening", () => {
    console.log("[ - HTTP - ] Server is ready to accept connections")
  })
}
