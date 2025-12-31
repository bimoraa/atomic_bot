import express, { Request, Response } from "express"
import { Client }                     from "discord.js"
import { handle_github_webhook }      from "./webhooks/github"

const port       = parseInt(process.env.PORT || process.env.WEBHOOK_PORT || "3456", 10)
const public_url = process.env.PUBLIC_URL || `http://localhost:${port}`

let bot_ready = false
let discord_client: Client | null = null

export function start_webhook_server(client: Client): void {
  discord_client = client
  
  const app = express()

  app.use(express.json())

  app.post("/webhook/github", async (req: Request, res: Response) => {
    try {
      console.log("[Webhook] Received webhook request")
      const event = req.headers["x-github-event"] as string
      
      if (event === "push") {
        console.log("[Webhook] Processing push event")
        if (discord_client) {
          await handle_github_webhook(req.body, discord_client)
        }
      }

      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[Webhook] Error:", err)
      res.status(500).json({ error: "Internal server error" })
    }
  })

  app.get("/health", (req: Request, res: Response) => {
    const is_ready = discord_client?.isReady() || false
    const status   = is_ready ? "healthy" : "starting"
    
    res.status(200).json({ 
      status,
      bot_ready : is_ready,
      uptime    : process.uptime(),
      memory    : process.memoryUsage(),
      timestamp : new Date().toISOString(),
    })
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
      },
    })
  })

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`[HTTP] Server listening on 0.0.0.0:${port}`)
    console.log(`[HTTP] Public URL: ${public_url}`)
    console.log(`[HTTP] Health endpoint: ${public_url}/health`)
    console.log(`[HTTP] Webhook endpoint: ${public_url}/webhook/github`)
  })

  server.on("error", (err: Error) => {
    console.error("[HTTP] Server error:", err)
    if ((err as any).code === "EADDRINUSE") {
      console.error(`[HTTP] Port ${port} is already in use`)
      process.exit(1)
    }
  })

  server.on("listening", () => {
    console.log("[HTTP] Server is ready to accept connections")
  })
}
