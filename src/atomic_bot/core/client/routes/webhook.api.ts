// - webhook 路由，目前处理 GitHub 的 webhook - \
// - webhook router, currently handles github webhooks - \
import { Router, Request, Response } from "express"
import { Client }                    from "discord.js"
import { handle_github_webhook }     from "../../../infrastructure/webhooks/github"

/**
 * @description Create webhook router
 * @param client - Discord client instance
 * @returns Express Router
 */
export function create_webhook_router(client: Client | null): Router {
  const router = Router()

  router.post("/webhook/github", async (req: Request, res: Response) => {
    try {
      console.log("[ - WEBHOOK - ] Received webhook request")
      const event = req.headers["x-github-event"] as string

      if (event === "push") {
        console.log("[ - WEBHOOK - ] Processing push event")
        if (client) await handle_github_webhook(req.body, client)
      }

      res.status(200).json({ success: true })
    } catch (err) {
      console.error("[ - WEBHOOK - ] Error:", err)
      res.status(500).json({ error: "Internal server error" })
    }
  })

  return router
}
