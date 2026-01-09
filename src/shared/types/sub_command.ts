import { Message, Client } from "discord.js"

export interface SubCommand {
  name       : string
  description: string
  execute    : (message: Message, args: string[], client: Client) => Promise<void>
}
