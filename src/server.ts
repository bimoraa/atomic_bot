import express, { Request, Response } from "express"
import { Client }                     from "discord.js"
import { handle_github_webhook }      from "./webhooks/github"

const port        = parseInt(process.env.PORT || process.env.WEBHOOK_PORT || "3456", 10)
const public_url  = process.env.PUBLIC_URL || "http://ballast.proxy.rlwy.net:30832"

export function start_webhook_server(client: Client): void {
  const app = express()

  app.use(express.json())

  app.post("/webhook/github", async (req: Request, res: Response) => {
    try {
      console.log("[Webhook] Received webhook request")
      const event = req.headers["x-github-event"] as string
      
      if (event === "push") {
        console.log("[Webhook] Processing push event")
        await handle_github_webhook(req.body, client)
      }

      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[Webhook] Error:", err)
      res.status(500).json({ error: "Internal server error" })
    }
  })

  app.get("/health", (req: Request, res: Response) => {
    console.log("[Webhook] Health check requested")
    res.status(200).json({ status: "ok", port, url: public_url })
  })

  app.get("/", (req: Request, res: Response) => {
    console.log("[Webhook] Root endpoint requested")
    res.status(200).json({ 
      status: "running",
      service: "atomic_bot",
      port,
      url: public_url,
      endpoints: {
        health: `${public_url}/health`,
        webhook: `${public_url}/webhook/github`
      }
    })
  })

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`[Webhook] Server listening on 0.0.0.0:${port}`)
    console.log(`[Webhook] Public URL: ${public_url}`)
    console.log(`[Webhook] Health check: ${public_url}/health`)
  })

  server.on("error", (err) => {
    console.error("[Webhook] Server error:", err)
  })
}
