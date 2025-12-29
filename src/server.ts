import express from "express"
import { client }                 from "./index"
import { handle_github_webhook }  from "./webhooks/github"

const port = process.env.PORT || process.env.WEBHOOK_PORT || 3456

export function start_webhook_server(): void {
  const app = express()

  app.use(express.json())

  app.post("/webhook/github", async (req, res) => {
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

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" })
  })

  app.listen(port, () => {
    console.log(`[Webhook] Server listening on port ${port}`)
  })
}
