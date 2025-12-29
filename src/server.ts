import express, { Request, Response } from "express"
import { Client }                     from "discord.js"
import { handle_github_webhook }      from "./webhooks/github"

const port = process.env.PORT || process.env.WEBHOOK_PORT || 3456

export function start_webhook_server(client: Client): void {
  const app = express()

  app.use(express.json())

  app.post("/webhook/github", async (req: Request, res: Response) => {
    try {
      const event = req.headers["x-github-event"] as string
      
      if (event === "push") {
        await handle_github_webhook(req.body, client)
      }

      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[Webhook] Error:", err)
      res.status(500).json({ error: "Internal server error" })
    }
  })

  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "ok" })
  })

  app.listen(port, () => {
    console.log(`[Webhook] Server listening on port ${port}`)
  })
}
