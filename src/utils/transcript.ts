// - Ticket transcript generation and storage utilities - \\

import { ThreadChannel, Client, Message, Collection } from "discord.js"
import { db, time } from "../utils"

/**
 * @param {string} length - Transcript ID length
 * @returns {string} Generated transcript ID
 */
export function generate_transcript_id(length: number = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let id      = ""
  
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return id
}

export interface transcript_message {
  id:          string
  author_id:   string
  author_tag:  string
  author_avatar: string
  content:     string
  attachments: any[]
  embeds:      any[]
  components?: any[]
  timestamp:   number
  is_bot:      boolean
}

export interface transcript_data {
  transcript_id: string
  ticket_id:     string
  ticket_type:   string
  thread_id:     string
  owner_id:      string
  owner_tag:     string
  claimed_by?:   string
  closed_by?:    string
  issue_type?:   string
  description?:  string
  messages:      transcript_message[]
  open_time:     number
  close_time:    number
}

/**
 * @param {ThreadChannel} thread - Discord thread channel
 * @param {number} limit - Maximum messages to fetch
 * @returns {Promise<transcript_message[]>} Array of transcript messages
 */
export async function fetch_thread_messages(thread: ThreadChannel, limit: number = 500): Promise<transcript_message[]> {
  const messages: transcript_message[] = []
  let last_id: string | undefined      = undefined

  while (messages.length < limit) {
    const options: any = { limit: Math.min(100, limit - messages.length) }
    if (last_id) options.before = last_id

    const fetched = await thread.messages.fetch(options)
    
    if (!(fetched instanceof Collection) || fetched.size === 0) break

    for (const [id, msg] of fetched.entries()) {
      // - CAPTURE FULL COMPONENT V2 DATA - \\
      const components_data = msg.components?.length > 0 
        ? JSON.parse(JSON.stringify(msg.components))
        : []

      // - CAPTURE EMBEDS WITH ALL FIELDS - \\
      const embeds_data = msg.embeds.map((e: any) => {
        const embed_json = e.toJSON()
        // - Ensure thumbnail and image are captured - \\
        if (e.thumbnail) {
          embed_json.thumbnail = {
            url: e.thumbnail.url,
            proxy_url: e.thumbnail.proxyURL,
            height: e.thumbnail.height,
            width: e.thumbnail.width
          }
        }
        if (e.image) {
          embed_json.image = {
            url: e.image.url,
            proxy_url: e.image.proxyURL,
            height: e.image.height,
            width: e.image.width
          }
        }
        if (e.video) {
          embed_json.video = {
            url: e.video.url,
            proxy_url: e.video.proxyURL,
            height: e.video.height,
            width: e.video.width
          }
        }
        return embed_json
      })

      if (components_data.length > 0) {
        console.log(`[ - TRANSCRIPT - ] Message ${msg.id} has ${components_data.length} components:`, JSON.stringify(components_data, null, 2))
      }

      messages.push({
        id           : msg.id,
        author_id    : msg.author.id,
        author_tag   : msg.author.tag,
        author_avatar: msg.author.displayAvatarURL({ size: 128 }),
        content      : msg.content,
        attachments  : Array.from(msg.attachments.values()).map((a: any) => ({
          url: a.url,
          proxy_url: a.proxyURL,
          filename: a.name,
          size: a.size,
          width: a.width || null,
          height: a.height || null,
          content_type: a.contentType
        })),
        embeds       : embeds_data,
        components   : components_data,
        timestamp    : Math.floor(msg.createdTimestamp / 1000),
        is_bot       : msg.author.bot,
      })
    }

    const lastMessage = Array.from(fetched.values()).pop()
    last_id = lastMessage?.id
  }

  return messages.reverse()
}

/**
 * @param {transcript_data} data - Transcript data to save
 * @returns {Promise<void>}
 */
export async function save_transcript(data: transcript_data): Promise<void> {
  console.log(`[ - TRANSCRIPT SAVE START - ] ID: ${data.transcript_id}, Ticket: ${data.ticket_id}`)
  console.log(`[ - TRANSCRIPT SAVE START - ] Messages count: ${data.messages.length}`)
  console.log(`[ - TRANSCRIPT SAVE START - ] Database connected: ${db.is_connected()}`)

  if (!db.is_connected()) {
    const error_msg = "Database not connected when saving transcript"
    console.error(`[ - TRANSCRIPT ERROR - ] ${error_msg}`)
    throw new Error(error_msg)
  }

  try {
    // - Log database connection info - \\
    const db_url = process.env.DATABASE_URL || ""
    const db_host = db_url.match(/@([^:/]+)/)?.[1] || "unknown"
    const db_name = db_url.match(/\/([^?]+)$/)?.[1] || "unknown"
    console.log(`[ - TRANSCRIPT DB INFO - ] Host: ${db_host}, Database: ${db_name}`)
    
    // - Check table exists and count - \\
    const pool = (db as any).pool
    if (pool) {
      const count_result = await pool.query("SELECT COUNT(*) FROM ticket_transcripts")
      console.log(`[ - TRANSCRIPT DB INFO - ] Current row count: ${count_result.rows[0].count}`)
    }

    const insert_data = {
      transcript_id: data.transcript_id,
      ticket_id    : data.ticket_id,
      ticket_type  : data.ticket_type,
      thread_id    : data.thread_id,
      owner_id     : data.owner_id,
      owner_tag    : data.owner_tag,
      claimed_by   : data.claimed_by || null,
      closed_by    : data.closed_by || null,
      issue_type   : data.issue_type || null,
      description  : data.description || null,
      messages     : JSON.stringify(data.messages),
      open_time    : data.open_time,
      close_time   : data.close_time,
    }

    console.log(`[ - TRANSCRIPT SAVE DATA - ] Insert data prepared:`, {
      transcript_id: insert_data.transcript_id,
      ticket_id: insert_data.ticket_id,
      ticket_type: insert_data.ticket_type,
      messages_length: insert_data.messages.length
    })

    const result = await db.insert_one("ticket_transcripts", insert_data)

    console.log(`[ - TRANSCRIPT SAVED - ] ID: ${data.transcript_id}, Ticket: ${data.ticket_id}, DB ID: ${result}`)
    
    // - Verify save and log full count - \\
    const verify = await db.find_one<any>("ticket_transcripts", { transcript_id: data.transcript_id })
    if (!verify) {
      console.error(`[ - TRANSCRIPT VERIFY FAILED - ] Transcript ${data.transcript_id} not found in DB after insert!`)
      throw new Error(`Transcript verification failed for ${data.transcript_id}`)
    }
    console.log(`[ - TRANSCRIPT VERIFIED - ] Found in DB: ${verify.transcript_id}`)
    
    // - Final count check - \\
    if (pool) {
      const final_count = await pool.query("SELECT COUNT(*) FROM ticket_transcripts")
      console.log(`[ - TRANSCRIPT DB INFO - ] Final row count: ${final_count.rows[0].count}`)
    }
  } catch (error) {
    console.error("[ - TRANSCRIPT SAVE ERROR - ] Failed to save transcript")
    console.error("[ - TRANSCRIPT SAVE ERROR - ] Transcript ID:", data.transcript_id)
    console.error("[ - TRANSCRIPT SAVE ERROR - ] Ticket ID:", data.ticket_id)
    console.error("[ - TRANSCRIPT SAVE ERROR - ] Owner ID:", data.owner_id)
    console.error("[ - TRANSCRIPT SAVE ERROR - ] Thread ID:", data.thread_id)
    console.error("[ - TRANSCRIPT SAVE ERROR - ] Error:", error)
    if (error instanceof Error) {
      console.error("[ - TRANSCRIPT SAVE ERROR - ] Error name:", error.name)
      console.error("[ - TRANSCRIPT SAVE ERROR - ] Error message:", error.message)
      console.error("[ - TRANSCRIPT SAVE ERROR - ] Error stack:", error.stack)
    }
    throw error
  }
}

/**
 * @param {string} transcript_id - Transcript ID to fetch
 * @returns {Promise<transcript_data | null>} Transcript data or null
 */
export async function get_transcript(transcript_id: string): Promise<transcript_data | null> {
  if (!db.is_connected()) return null

  try {
    const result = await db.find_one<any>("ticket_transcripts", { transcript_id })
    if (!result) return null

    return {
      transcript_id: result.transcript_id,
      ticket_id    : result.ticket_id,
      ticket_type  : result.ticket_type,
      thread_id    : result.thread_id,
      owner_id     : result.owner_id,
      owner_tag    : result.owner_tag,
      claimed_by   : result.claimed_by,
      closed_by    : result.closed_by,
      issue_type   : result.issue_type,
      description  : result.description,
      messages     : typeof result.messages === "string" ? JSON.parse(result.messages) : result.messages,
      open_time    : result.open_time,
      close_time   : result.close_time,
    }
  } catch (error) {
    console.error("[ - TRANSCRIPT FETCH ERROR - ]", error)
    return null
  }
}

/**
 * @param {ThreadChannel} thread - Thread channel
 * @param {Client} client - Discord client
 * @param {string} ticket_id - Ticket ID
 * @param {string} ticket_type - Ticket type
 * @param {string} owner_id - Owner user ID
 * @param {number} open_time - Open timestamp
 * @param {string} closed_by - Closer user ID or "System"
 * @param {string} claimed_by - Claimer user ID
 * @param {string} issue_type - Issue type
 * @param {string} description - Ticket description
 * @returns {Promise<string>} Generated transcript ID
 */
export async function generate_transcript(
  thread: ThreadChannel,
  client: Client,
  ticket_id: string,
  ticket_type: string,
  owner_id: string,
  open_time: number,
  closed_by?: string,
  claimed_by?: string,
  issue_type?: string,
  description?: string
): Promise<string> {
  const transcript_id = generate_transcript_id()
  const close_time    = time.now()
  
  let owner_tag = "Unknown"
  try {
    const owner = await client.users.fetch(owner_id)
    owner_tag   = owner.tag
  } catch {}

  const messages = await fetch_thread_messages(thread)

  const data: transcript_data = {
    transcript_id,
    ticket_id,
    ticket_type,
    thread_id  : thread.id,
    owner_id,
    owner_tag,
    claimed_by,
    closed_by,
    issue_type,
    description,
    messages,
    open_time,
    close_time,
  }

  await save_transcript(data)

  return transcript_id
}
