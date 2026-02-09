import { TextChannel, AnyThreadChannel } from "discord.js"
import { logger, array } from "@shared/utils"

type fetchable_channel = TextChannel | AnyThreadChannel

const max_messages   = 1000
const log            = logger.create_logger("message_counter")

interface message_log {
  author:    string
  content:   string
  reply_to?: { author: string; content: string }
  timestamp: Date
}

interface fetch_result {
  count: number
  logs:  message_log[]
}

interface count_result {
  channel_count: number
  thread_count:  number
  logs:          message_log[]
}

async function fetch_messages(
  channel:    fetchable_channel,
  user_id:    string,
  after_date?: Date
): Promise<fetch_result> {
  let count            = 0
  const logs: message_log[] = []
  let last_id: string | undefined
  let fetched          = 0

  log.debug(`Fetching ${channel.name}`)

  while (fetched < max_messages) {
    const options: { limit: number; before?: string } = { limit: 100 }
    if (last_id) options.before = last_id

    const messages = await channel.messages.fetch(options)
    if (messages.size === 0) break

    for (const [, msg] of messages) {
      if (after_date && msg.createdAt < after_date) {
        log.debug(`${channel.name} done: ${count}`)
        return { count, logs }
      }

      if (msg.author.id === user_id) {
        count++

        const entry: message_log = {
          author:    msg.author.tag,
          content:   msg.content || "[attachment/embed]",
          timestamp: msg.createdAt,
        }

        if (msg.reference?.messageId) {
          try {
            const replied  = await msg.fetchReference()
            entry.reply_to = {
              author:  replied.author.tag,
              content: replied.content?.slice(0, 50) || "[attachment/embed]",
            }
          } catch {}
        }

        logs.push(entry)
      }
    }

    fetched += messages.size
    last_id  = messages.last()?.id

    if (messages.size < 100) break
  }

  log.debug(`${channel.name} done: ${count}`)
  return { count, logs }
}

export async function count_user_messages(
  channel:    TextChannel,
  user_id:    string,
  after_date?: Date
): Promise<count_result> {
  log.info("Starting message count")

  const channel_result = await fetch_messages(channel, user_id, after_date)
  let all_logs         = [...channel_result.logs]
  let thread_count     = 0

  try {
    const [active, archived] = await Promise.all([
      channel.threads.fetchActive(),
      channel.threads.fetchArchived({ limit: 5 }),
    ])

    const threads = [...active.threads.values(), ...archived.threads.values()].slice(0, 5)

    const results = await Promise.all(
      threads.map((thread) => fetch_messages(thread, user_id, after_date))
    )

    for (const result of results) {
      thread_count += result.count
      all_logs      = all_logs.concat(result.logs)
    }
  } catch {}

  all_logs = array.sort_by(all_logs, "timestamp", "desc")

  log.info(`Done: channel=${channel_result.count} threads=${thread_count}`)
  return { channel_count: channel_result.count, thread_count, logs: all_logs }
}

export function format_logs(logs: message_log[], limit: number = 50): string {
  const limited      = logs.slice(0, limit)
  let output         = ""
  let current_date   = ""

  for (const entry of limited) {
    const date_str = entry.timestamp.toLocaleDateString("en-US", {
      weekday: "long",
      year:    "numeric",
      month:   "long",
      day:     "numeric",
    })

    const time_str = entry.timestamp.toLocaleTimeString("en-US", {
      hour:   "2-digit",
      minute: "2-digit",
    })

    if (date_str !== current_date) {
      current_date = date_str
      output      += `\n[ ${date_str} ]\n`
    }

    if (entry.reply_to) {
      output += `[ ${entry.author} - ${time_str} ] replied to ${entry.reply_to.author}:\n`
      output += `  > ${entry.reply_to.content}\n`
      output += `  ${entry.content}\n\n`
    } else {
      output += `[ ${entry.author} - ${time_str} ] - ${entry.content}\n\n`
    }
  }

  return output.trim() || "No messages found."
}
