"use client"

import { cn } from "@/lib/utils"
import { Paperclip, Bot, Hash, ChevronDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
import { UserDialog } from '@/components/features/users/user_dialog'

export interface transcript_attachment {
  url: string
  proxy_url?: string
  filename?: string
  size?: number
  width?: number | null
  height?: number | null
  content_type?: string
}

export interface transcript_message {
  id: string
  type: number
  author_id: string
  author_tag: string
  author_avatar: string
  content: string
  attachments: (string | transcript_attachment)[]
  embeds: any[]
  components?: any[]
  timestamp: number
  is_bot: boolean
  mentions?: { id: string; username: string; tag: string }[]
  referenced_message?: {
    id: string
    author_id: string
    author_tag: string
    author_avatar: string
    content: string
  }
}

export interface TranscriptMessageProps {
  message       : transcript_message
  transcript_id?: string
  ticket_type  ?: string
}

// - BASIC MARKDOWN PARSER (for component rendering) - \\
/**
 * @param text - Raw markdown text
 * @returns HTML string with markdown formatted
 */
function parse_basic_markdown(text: string): string {
  // - Custom emojis: <a:name:id> and <:name:id> (BEFORE HTML escape) - \\
  text = text.replace(/<a:(\w+):(\d+)>/g, '\x01EMOJI\x02animated\x02$1\x02$2\x03')
  text = text.replace(/<:(\w+):(\d+)>/g,  '\x01EMOJI\x02static\x02$1\x02$2\x03')

  // - Escape HTML \\
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // - Restore custom emojis \\
  text = text.replace(/\x01EMOJI\x02animated\x02([^\x03]+)\x02(\d+)\x03/g,
    '<img src="https://cdn.discordapp.com/emojis/$2.gif" alt=":$1:" title=":$1:" class="inline-block w-5 h-5 align-middle" style="display:inline;vertical-align:middle" loading="lazy" />'
  )
  text = text.replace(/\x01EMOJI\x02static\x02([^\x03]+)\x02(\d+)\x03/g,
    '<img src="https://cdn.discordapp.com/emojis/$2.webp" alt=":$1:" title=":$1:" class="inline-block w-5 h-5 align-middle" style="display:inline;vertical-align:middle" loading="lazy" />'
  )
  
  // - Inline code (must be before other formatting) \\
  text = text.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">$1</code>')
  
  // - Strikethrough: ~~text~~ \\
  text = text.replace(/~~([^~]+)~~/g, '<span class="line-through">$1</span>')
  
  // - Bold: **text** (must be before italic) \\
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>')
  
  // - Underline: __text__ \\
  text = text.replace(/__([^_]+)__/g, '<span class="underline">$1</span>')
  
  // - Italic: *text* or _text_ \\
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic">$1</em>')
  text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em class="italic">$1</em>')
  
  // - Spoiler: ||text|| \\
  text = text.replace(/\|\|([^|]+)\|\|/g, '<span class="bg-muted px-1 rounded cursor-pointer hover:bg-transparent transition-colors">$1</span>')
  
  // - Links: [text](url) \\
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
  
  return text
}

// - RENDER EMBED - \\
/**
 * @param embed - Discord embed object
 * @param index - Unique key
 * @returns Rendered embed with shadcn
 */
function render_embed(embed: any, index: number) {
  if (!embed) return null
  
  const border_color = embed.color 
    ? `#${embed.color.toString(16).padStart(6, '0')}` 
    : 'hsl(var(--primary))'
  
  return (
    <Card key={index} className="mt-2 border-l-4 rounded-md" style={{ borderLeftColor: border_color }}>
      <CardContent className="p-2 sm:p-3">
        {embed.author && (
          <div className="flex items-center gap-2 mb-2">
            {embed.author.icon_url && (
              <img src={embed.author.icon_url} alt="" className="w-6 h-6 rounded-full" />
            )}
            <span className="text-sm font-semibold">{embed.author.name}</span>
          </div>
        )}
        {embed.title && (
          <div className="font-semibold text-xs sm:text-sm mb-1">{embed.title}</div>
        )}
        {embed.description && (
          <div className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">{embed.description}</div>
        )}
        {embed.thumbnail && (
          <img src={embed.thumbnail.url} alt="" className="float-right ml-2 rounded w-20 h-20 object-cover" />
        )}
        {embed.fields && embed.fields.length > 0 && (
          <div className="mt-2 grid grid-cols-1 gap-2">
            {embed.fields.map((field: any, idx: number) => (
              <div key={idx}>
                <div className="font-semibold text-xs">{field.name}</div>
                <div className="text-xs text-muted-foreground">{field.value}</div>
              </div>
            ))}
          </div>
        )}
        {embed.image && (
          <img src={embed.image.url} alt="" className="mt-2 rounded max-w-full" />
        )}
        {embed.footer && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {embed.footer.icon_url && (
              <img src={embed.footer.icon_url} alt="" className="w-5 h-5 rounded-full" />
            )}
            <span>{embed.footer.text}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// - RENDER COMPONENT V2 - \\
/**
 * @param component - Discord component v2
 * @param index - Unique key
 * @returns Rendered component with shadcn
 */
function render_component(component: any, index: number | string): any {
  if (!component) return null
  
  // - TYPE 17 - Container \\
  if (component.type === 17) {
    const has_accent = component.accent_color
    return (
      <Card key={`container-${index}`} className={cn("my-2 rounded-md", has_accent && "border-l-4")} style={has_accent ? { borderLeftColor: `#${component.accent_color.toString(16).padStart(6, '0')}` } : {}}>
        <CardContent className="p-3 sm:p-4 flex flex-col pt-3 pb-3">
          {component.components?.map((child: any, idx: number) => render_component(child, `${index}-${idx}`))}
        </CardContent>
      </Card>
    )
  }
  
  // - TYPE 9 - Section \\
  if (component.type === 9) {
    return (
      <div key={`section-${index}`} className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          {component.components?.map((child: any, idx: number) => render_component(child, `${index}-${idx}`))}
        </div>
        {component.accessory && component.accessory.type === 11 && (
          <div className="flex-shrink-0 mt-0.5">
            <img 
              src={component.accessory.media?.url} 
              alt="" 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-md object-cover border border-border/50"
            />
          </div>
        )}
      </div>
    )
  }
  
  // - TYPE 10 - Text/Markdown \\
  if (component.type === 10) {
    const content = component.content || ''
    const lines = content.split('\n')
    let in_code = false
    let code_lang = ''
    let code_lines: string[] = []
    let in_quote = false
    let quote_lines: string[] = []
    const elements: any[] = []
    
    lines.forEach((line: string, idx: number) => {
      // - CODE BLOCK - \\
      if (line.trim().startsWith('```')) {
        if (!in_code) {
          // - Close any open quote \\
          if (in_quote) {
            elements.push(
              <blockquote key={`quote-${idx}`} className="border-l-4 border-muted-foreground/30 pl-3 my-2 italic text-muted-foreground">
                {quote_lines.map((qline, qidx) => (
                  <p key={qidx} dangerouslySetInnerHTML={{ __html: parse_basic_markdown(qline) }} />
                ))}
              </blockquote>
            )
            in_quote = false
            quote_lines = []
          }
          
          in_code = true
          code_lang = line.trim().substring(3)
          code_lines = []
        } else {
          elements.push(
            <pre key={`code-${idx}`} className="my-2 rounded-md bg-muted p-3 overflow-x-auto border">
              {code_lang && (
                <div className="text-xs text-muted-foreground font-mono mb-2 pb-1 border-b">{code_lang}</div>
              )}
              <code className="text-sm font-mono leading-relaxed">{code_lines.join('\n')}</code>
            </pre>
          )
          in_code = false
          code_lang = ''
          code_lines = []
        }
      } else if (in_code) {
        code_lines.push(line)
      } else if (line.startsWith('> ')) {
        // - BLOCKQUOTE - \\
        if (!in_quote) {
          in_quote = true
          quote_lines = []
        }
        quote_lines.push(line.substring(2))
      } else {
        // - FLUSH QUOTE - \\
        if (in_quote) {
          elements.push(
            <blockquote key={`quote-${idx}`} className="border-l-4 border-muted-foreground/30 pl-3 my-2 italic text-muted-foreground">
              {quote_lines.map((qline, qidx) => (
                <p key={qidx} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: parse_basic_markdown(qline) }} />
              ))}
            </blockquote>
          )
          in_quote = false
          quote_lines = []
        }
        
        // - HEADINGS - \\
        if (line.startsWith('### ')) {
          elements.push(
            <h3 key={idx} className="scroll-m-20 text-base font-semibold tracking-tight mt-0 mb-1">
              <span dangerouslySetInnerHTML={{ __html: parse_basic_markdown(line.substring(4)) }} />
            </h3>
          )
        } else if (line.startsWith('## ')) {
          elements.push(
            <h2 key={idx} className="scroll-m-20 text-lg font-semibold tracking-tight mt-0 mb-2">
              <span dangerouslySetInnerHTML={{ __html: parse_basic_markdown(line.substring(3)) }} />
            </h2>
          )
        } else if (line.startsWith('# ')) {
          elements.push(
            <h1 key={idx} className="scroll-m-20 text-xl font-bold tracking-tight mt-0 mb-2">
              <span dangerouslySetInnerHTML={{ __html: parse_basic_markdown(line.substring(2)) }} />
            </h1>
          )
        } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          // - UNORDERED LIST - \\
          elements.push(
            <li key={idx} className="ml-6 list-disc text-sm leading-relaxed">
              <span dangerouslySetInnerHTML={{ __html: parse_basic_markdown(line.trim().substring(2)) }} />
            </li>
          )
        } else if (/^\d+\.\s/.test(line.trim())) {
          // - ORDERED LIST - \\
          const match = line.trim().match(/^\d+\.\s(.*)/)
          if (match) {
            elements.push(
              <li key={idx} className="ml-6 list-decimal text-sm leading-relaxed">
                <span dangerouslySetInnerHTML={{ __html: parse_basic_markdown(match[1]) }} />
              </li>
            )
          }
        } else if (line.trim()) {
          elements.push(
            <p key={idx} className="leading-7 text-sm [&:not(:first-child)]:mt-2">
              <span dangerouslySetInnerHTML={{ __html: parse_basic_markdown(line) }} />
            </p>
          )
        } else {
          elements.push(<div key={idx} className="h-2" />)
        }
      }
    })
    
    // - FLUSH REMAINING QUOTE - \\
    if (in_quote) {
      elements.push(
        <blockquote key="quote-final" className="border-l-4 border-muted-foreground/30 pl-3 my-2 italic text-muted-foreground">
          {quote_lines.map((qline, qidx) => (
            <p key={qidx} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: parse_basic_markdown(qline) }} />
          ))}
        </blockquote>
      )
    }
    
    return <div key={`text-${index}`} className="space-y-1">{elements}</div>
  }
  
  // - TYPE 14 - Separator \\
  if (component.type === 14) {
    const spacing = component.spacing || 1
    return (
      <div key={`spacing-${index}`} className="my-2" style={{ marginTop: `${spacing * 8}px`, marginBottom: `${spacing * 8}px` }}>
        <Separator />
      </div>
    )
  }
  
  // - TYPE 1 - Action Row \\
  if (component.type === 1) {
    return (
      <div key={`action-${index}`} className="flex flex-wrap gap-2 mt-2 mb-0">
        {component.components?.map((child: any, idx: number) => {
          // - TYPE 2 - Button \\
          if (child.type === 2) {
            const variants: Record<number, any> = {
              1: { variant: 'default', className: 'bg-blue-600 hover:bg-blue-700' },
              2: { variant: 'secondary' },
              3: { variant: 'default', className: 'bg-green-600 hover:bg-green-700' },
              4: { variant: 'destructive' },
              5: { variant: 'outline' }
            }
            
            const btn_style = variants[child.style] || variants[2]
            
            return (
              <Button
                key={idx}
                disabled
                variant={btn_style.variant}
                size="sm"
                className={cn("cursor-not-allowed", btn_style.className)}
              >
                {child.label}
              </Button>
            )
          }
          
          // - TYPE 3-8 - Select Menus \\
          if (child.type >= 3 && child.type <= 8) {
            return (
              <div
                key={idx}
                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border bg-background hover:bg-accent cursor-not-allowed"
              >
                <span className="text-muted-foreground">{child.placeholder || 'Select an option'}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </div>
            )
          }
          
          return null
        })}
      </div>
    )
  }
  
  return null
}

export function TranscriptMessage({ message, transcript_id, ticket_type }: TranscriptMessageProps) {
  const [user_cache, set_user_cache]                 = useState<Record<string, any>>({})
  const [channel_cache, set_channel_cache]           = useState<Record<string, any>>({})
  const [member_cache, set_member_cache]             = useState<Record<string, any>>({})
  const [is_loading, set_is_loading]                 = useState(true)
  const [show_user_modal, set_show_user_modal]       = useState(false)
  const [selected_user, set_selected_user]           = useState<any>(null)
  const [loading_user, set_loading_user]             = useState(false)
  const [time_str, set_time_str]                     = useState<string>('')
  useEffect(() => {
    const date = new Date(message.timestamp * 1000)
    const formatted = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    set_time_str(formatted)
  }, [message.timestamp])

  // - EXTRACT ALL USER IDS AND CHANNEL IDS FROM MESSAGE - \\
  useEffect(() => {
    const extract_user_ids = (text: string): string[] => {
      const matches = text.matchAll(/<@!?(\d+)>/g)
      return Array.from(matches, m => m[1])
    }

    const extract_channel_ids = (text: string): string[] => {
      const matches = text.matchAll(/<#(\d+)>/g)
      return Array.from(matches, m => m[1])
    }

    const fetch_all_users = async () => {
      const user_ids = extract_user_ids(message.content)
      if (user_ids.length === 0) {
        set_is_loading(false)
        return
      }

      console.log(`[ - TRANSCRIPT - ] User IDs:`, user_ids)
      
      const cache: Record<string, any> = {}

      await Promise.all(
        user_ids.map(async (user_id) => {
          try {
            const res = await fetch(`/api/discord-user/${user_id}`)
            if (res.ok) {
              const data = await res.json()
              console.log(`[ - TRANSCRIPT - ] Got user ${user_id}:`, data.username)
              cache[user_id] = data
            } else {
              console.error(`[ - TRANSCRIPT - ] Failed to fetch user ${user_id}: ${res.status}`)
            }
          } catch (err) {
            console.error(`[ - FETCH USER - ] Failed for ${user_id}:`, err)
          }
        })
      )

      console.log(`[ - TRANSCRIPT - ] User cache:`, cache)
      set_user_cache(cache)
      set_is_loading(false)
    }

    const fetch_all_channels = async () => {
      const channel_ids = extract_channel_ids(message.content)
      if (channel_ids.length === 0) return

      console.log(`[ - TRANSCRIPT - ] Fetching channels:`, channel_ids)
      
      const cache: Record<string, any> = {}

      await Promise.all(
        channel_ids.map(async (channel_id) => {
          try {
            const res = await fetch(`/api/discord-channel/${channel_id}`)
            if (res.ok) {
              const data = await res.json()
              console.log(`[ - TRANSCRIPT - ] Got channel ${channel_id}:`, data.name)
              cache[channel_id] = data
            } else {
              console.error(`[ - TRANSCRIPT - ] Failed to fetch channel ${channel_id}: ${res.status}`)
            }
          } catch (err) {
            console.error(`[ - FETCH CHANNEL - ] Failed for ${channel_id}:`, err)
          }
        })
      )

      console.log(`[ - TRANSCRIPT - ] Channel cache:`, cache)
      set_channel_cache(cache)
    }

    // - Fetch author member data for role color - \\
    const fetch_author_member = async () => {
      try {
        const res = await fetch(`/api/discord-member/${message.author_id}`)
        if (res.ok) {
          const data = await res.json()
          set_member_cache({ [message.author_id]: data })
        }
      } catch (err) {
        console.error(`[ - FETCH MEMBER - ] Failed:`, err)
      }
    }

    fetch_all_users()
    fetch_all_channels()
    fetch_author_member()
  }, [message.content, message.author_id])

  // - FETCH MEMBER DETAILS - \\
  /**
   * @param user_id - Discord user ID
   * @description Fetch member details from bot API
   */
  const fetch_member_details = async (user_id: string) => {
    set_loading_user(true)
    try {
      const res = await fetch(`/api/discord-member/${user_id}`)
      
      if (res.ok) {
        const data = await res.json()
        set_selected_user(data)
        set_show_user_modal(true)
      } else {
        console.error(`[ - FETCH MEMBER - ] Failed: ${res.status}`)
      }
    } catch (err) {
      console.error(`[ - FETCH MEMBER - ] Error:`, err)
    } finally {
      set_loading_user(false)
    }
  }

  // - HANDLE AVATAR CLICK - \\
  /**
   * @param user_id - Discord user ID
   * @description Show user details modal
   */
  const handle_avatar_click = (user_id: string) => {
    fetch_member_details(user_id)
  }

  // - PARSE MARKDOWN WITH MENTIONS - \\
  /**
   * @param text - Message text with Discord markdown
   * @returns Parsed HTML with mentions resolved
   */
  const parse_markdown = (text: string) => {
    // - User mentions: <@ID> (BEFORE HTML escaping) - \\
    text = text.replace(/<@!?(\d+)>/g, (match, user_id) => {
      const user = user_cache[user_id]
      if (user) {
        console.log(`[ - MENTION - ] Resolved ${user_id} to @${user.username}`)
        return `__MENTION_${user_id}_${user.username}__`
      }
      console.log(`[ - MENTION - ] User ${user_id} not in cache:`, Object.keys(user_cache))
      return match
    })
    
    // - Channel mentions: <#ID> - \\
    text = text.replace(/<#(\d+)>/g, (match, channel_id) => {
      const channel = channel_cache[channel_id]
      if (channel) {
        console.log(`[ - CHANNEL MENTION - ] Resolved ${channel_id} to #${channel.name}`)
        return `__CHANNEL_${channel_id}_${channel.name}__`
      }
      console.log(`[ - CHANNEL MENTION - ] Channel ${channel_id} not in cache`)
      return `__CHANNEL_${channel_id}_channel__`
    })
    
    // - Role mentions: <@&ID> - \\
    text = text.replace(/<@&(\d+)>/g, '__ROLE_$1__')

    // - Custom emojis: <a:name:id> and <:name:id> (BEFORE HTML escape) - \\
    text = text.replace(/<a:(\w+):(\d+)>/g, '\x01EMOJI\x02animated\x02$1\x02$2\x03')
    text = text.replace(/<:(\w+):(\d+)>/g,  '\x01EMOJI\x02static\x02$1\x02$2\x03')

    // - Escape HTML \\
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // - Restore mentions with HTML - \\
    text = text.replace(/__MENTION_(\d+)_([^_]+)__/g, '<span class="inline-flex items-center gap-1 px-1 rounded bg-blue-500/20 text-blue-400 font-medium">@$2</span>')
    text = text.replace(/__CHANNEL_(\d+)_([^_]+)__/g, '<span class="inline-flex items-center gap-1 px-1 rounded bg-blue-500/20 text-blue-400 font-medium">#$2</span>')
    text = text.replace(/__ROLE_(\d+)__/g, '<span class="inline-flex items-center gap-1 px-1 rounded bg-blue-500/20 text-blue-400 font-medium">@role</span>')

    // - Restore custom emojis \\
    text = text.replace(/\x01EMOJI\x02animated\x02([^\x03]+)\x02(\d+)\x03/g,
      '<img src="https://cdn.discordapp.com/emojis/$2.gif" alt=":$1:" title=":$1:" class="inline-block w-5 h-5 align-middle" style="display:inline;vertical-align:middle" loading="lazy" />'
    )
    text = text.replace(/\x01EMOJI\x02static\x02([^\x03]+)\x02(\d+)\x03/g,
      '<img src="https://cdn.discordapp.com/emojis/$2.webp" alt=":$1:" title=":$1:" class="inline-block w-5 h-5 align-middle" style="display:inline;vertical-align:middle" loading="lazy" />'
    )
    
    // - Inline code (must be before other formatting) \\
    text = text.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">$1</code>')
    
    // - Strikethrough: ~~text~~ \\
    text = text.replace(/~~([^~]+)~~/g, '<span class="line-through">$1</span>')
    
    // - Bold: **text** (must be before italic) \\
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>')
    
    // - Underline: __text__ \\
    text = text.replace(/__([^_]+)__/g, '<span class="underline">$1</span>')
    
    // - Italic: *text* or _text_ \\
    text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic">$1</em>')
    text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em class="italic">$1</em>')
    
    // - Spoiler: ||text|| \\
    text = text.replace(/\|\|([^|]+)\|\|/g, '<span class="bg-muted px-1 rounded cursor-pointer hover:bg-transparent transition-colors">$1</span>')
    
    // - Links: [text](url) \\
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
    
    return text
  }

  // - Get author role color - \\
  const get_author_color = () => {
    const member = member_cache[message.author_id]
    if (member?.roles && member.roles.length > 0) {
      const top_role = member.roles.sort((a: any, b: any) => b.position - a.position)[0]
      return top_role.color !== '#000000' ? top_role.color : null
    }
    return null
  }

  const author_color = get_author_color()

  // - RENDER SYSTEM MESSAGE - \\
  /**
   * @returns System message formatted text
   */
  const render_system_message = () => {
    const mention = message.mentions && message.mentions.length > 0 ? message.mentions[0] : null
    
    switch (message.type) {
      case 7: // - THREAD_MEMBER_JOIN - \\
        return (
          <div className="flex items-center gap-2 py-4 px-3 sm:px-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{message.author_tag}</span>
            <span>joined the thread.</span>
          </div>
        )
      
      case 8: // - GUILD_MEMBER_JOIN - \\
        return (
          <div className="flex items-center gap-2 py-4 px-3 sm:px-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{message.author_tag}</span>
            <span>joined the server.</span>
          </div>
        )
      
      case 19: // - REPLY - \\
        return null // - Render as normal message - \\
      
      case 21: // - THREAD_STARTER_MESSAGE - \\
        return null // - Render as normal message - \\
      
      default:
        if (mention) {
          return (
            <div className="flex items-center gap-2 py-4 px-3 sm:px-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{message.author_tag}</span>
              <span>added</span>
              <span className="font-semibold text-foreground">{mention.username}</span>
              <span>to the thread.</span>
            </div>
          )
        }
        return null
    }
  }

  const system_message = render_system_message()
  
  // - RENDER SYSTEM MESSAGE ONLY (if no content/components/embeds/attachments) - \\
  if (system_message && message.type !== 19 && message.type !== 21) {
    const has_content = message.content || 
                        (message.components && message.components.length > 0) ||
                        (message.embeds && message.embeds.length > 0) ||
                        (message.attachments && message.attachments.length > 0)
    
    if (!has_content) {
      return (
        <div className="border-b border-border/50 last:border-0">
          {system_message}
        </div>
      )
    }
  }

  // - CHECK FOR IMAGE ATTACHMENTS - \\
  const image_attachments = message.attachments?.filter(a => {
    const url          = typeof a === 'string' ? a : a.url
    const content_type = typeof a === 'object' ? a.content_type : ''
    return content_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url)
  }) || []

  const non_image_attachments = message.attachments?.filter(a => !image_attachments.includes(a as any)) || []

  // - UNIFIED CARD RENDER - \\
  if (false) {
    // - dead code: old image-only card block kept for reference - \\
    return null
  }

  // - DETECT STAFF / WHITELISTER / HELPER FOR RIGHT-SIDE LAYOUT - \\
  const __staff_role_id       = '1264915024707588208'
  const __whitelister_role_id = '1277272542914281512'
  const __helper_role_id      = '1357767950421065981'
  const member_roles          = member_cache[message.author_id]?.roles || []
  const is_helper_ticket      = ticket_type === 'helper'
  const is_staff_or_wl        = member_roles.some((role: any) =>
    role.id === __staff_role_id || role.id === __whitelister_role_id ||
    (is_helper_ticket && role.id === __helper_role_id)
  )

  // - COMPUTE CARD MAX WIDTH FROM IMAGE NATURAL SIZE - \\
  const only_images   = image_attachments.length > 0
                        && !message.content
                        && !(message.embeds?.length)
                        && !(message.components?.length)
                        && non_image_attachments.length === 0
  const first_img_w   = only_images && typeof image_attachments[0] === 'object'
                        ? (image_attachments[0] as transcript_attachment).width ?? null
                        : null
  const card_max_w    = first_img_w ? Math.min(first_img_w, 512) : 512

  return (
    <div className={cn(
      "py-3 px-3 sm:px-4 hover:bg-muted/5 transition-colors border-b border-border/50 last:border-0 flex",
      is_staff_or_wl ? "justify-end" : "justify-start"
    )}>
      <Card
        className={cn(
          'w-full gap-0 py-0 shadow-none overflow-hidden border',
          is_staff_or_wl ? 'bg-primary/5 border-primary/20' : 'bg-background border-border/40'
        )}
        style={{ maxWidth: `${card_max_w}px` }}
      >
        {/* - REFERENCED MESSAGE - */}
        {message.referenced_message && (
          <div className="flex items-center gap-2 px-4 pt-3 pb-0">
            <div className="w-4 h-4 border-l-2 border-t-2 border-muted-foreground/30 rounded-tl ml-2 flex-shrink-0" />
            <img
              src={message.referenced_message.author_avatar}
              alt={message.referenced_message.author_tag}
              className="w-4 h-4 rounded-full cursor-pointer hover:ring-1 hover:ring-primary transition-all flex-shrink-0"
              onClick={() => message.referenced_message && handle_avatar_click(message.referenced_message.author_id)}
            />
            <span className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer truncate" onClick={() => message.referenced_message && handle_avatar_click(message.referenced_message.author_id)}>
              {message.referenced_message.author_tag.split('#')[0]}
            </span>
            <span className="text-xs text-muted-foreground/60 truncate max-w-[200px]">
              {message.referenced_message.content || 'Replied to a message'}
            </span>
          </div>
        )}

        {/* - CARD HEADER - */}
        <div className={cn("flex items-center gap-3 px-4 pt-3 pb-2", is_staff_or_wl && "flex-row-reverse")}>
          <img
            alt={message.author_tag}
            className="h-10 w-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all bg-secondary flex-shrink-0"
            src={message.author_avatar}
            onClick={() => handle_avatar_click(message.author_id)}
          />
          <div className={cn("flex flex-col gap-0.5 min-w-0 flex-1", is_staff_or_wl && "items-end")}>
            <div className={cn("flex items-center gap-1.5 flex-wrap", is_staff_or_wl && "flex-row-reverse")}>
              <span 
                className="font-semibold text-sm leading-none" 
                style={author_color ? { color: author_color } : undefined}
              >
                {message.author_tag.split('#')[0]}
              </span>
              {message.is_bot && (
                <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 h-4 text-[9px] px-1 py-0 rounded-sm inline-flex items-center gap-0.5">
                  <Bot className="w-2.5 h-2.5" /> BOT
                </Badge>
              )}
              {member_roles.some((role: any) => role.id === __staff_role_id) && (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white h-4 text-[9px] px-1 py-0 rounded-sm inline-flex items-center">
                  STAFF
                </Badge>
              )}
              {member_roles.some((role: any) => role.id === __whitelister_role_id) && (
                <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 h-4 text-[9px] px-1 py-0 rounded-sm inline-flex items-center">
                  WHITELISTER
                </Badge>
              )}
              {is_helper_ticket && member_roles.some((role: any) => role.id === __helper_role_id) && (
                <Badge variant="default" className="bg-yellow-600 hover:bg-yellow-700 text-white h-4 text-[9px] px-1 py-0 rounded-sm inline-flex items-center">
                  HELPER
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{time_str}</span>
          </div>
          <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground w-8 h-8 flex-shrink-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        <CardContent className="p-0">
          {/* - TEXT CONTENT - */}
          {message.content && (
            <div className="px-4 pb-3">
              <div
                key={`content-${Object.keys(user_cache).length}-${Object.keys(channel_cache).length}`}
                className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parse_markdown(message.content) }}
              />
            </div>
          )}

          {/* - IMAGE ATTACHMENTS - */}
          {image_attachments.map((attachment, idx) => {
            const url = typeof attachment === 'string' ? attachment : attachment.url
            return (
              <a key={`img-${idx}`} href={url} target="_blank" rel="noopener noreferrer" className="block relative border-y border-border/40 bg-muted/10 overflow-hidden group">
                <img
                  src={url}
                  alt="Attachment"
                  className="block w-full h-auto object-contain max-h-[500px]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full">Click to expand</span>
                </div>
              </a>
            )
          })}

          {/* - NON-IMAGE ATTACHMENTS - */}
          {non_image_attachments.length > 0 && (
            <div className="px-4 py-3 flex flex-col gap-2">
              {non_image_attachments.map((attachment, i) => {
                const url      = typeof attachment === 'string' ? attachment : attachment.url
                const filename = typeof attachment === 'object' && attachment.filename ? attachment.filename : `Attachment ${i + 1}`
                return (
                  <a key={`file-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:text-blue-400 font-medium hover:underline flex items-center gap-2 p-2 rounded-md hover:bg-blue-500/10 transition-colors border border-border/40">
                    <div className="p-1.5 bg-blue-500/20 rounded">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <span className="truncate">{filename}</span>
                  </a>
                )
              })}
            </div>
          )}

          {/* - EMBEDS - */}
          {message.embeds && message.embeds.length > 0 && (
            <div className="px-4 pb-3">
              {message.embeds.map((embed, i) => render_embed(embed, i))}
            </div>
          )}

          {/* - COMPONENTS V2 - */}
          {message.components && message.components.length > 0 && (
            <div className="px-4 pb-3">
              {message.components.map((component, i) => render_component(component, i))}
            </div>
          )}
        </CardContent>

      </Card>

      {/* - USER DIALOG - */}
      {selected_user && (
        <UserDialog 
          user_id={selected_user.id}
          open={show_user_modal}
          on_close={() => set_show_user_modal(false)}
        />
      )}
    </div>
  )
}