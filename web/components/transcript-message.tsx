import { cn } from "@/lib/utils"
import { Paperclip, Image, FileText, Bot } from "lucide-react"

export interface transcript_message {
  id: string
  author_id: string
  author_tag: string
  author_avatar: string
  content: string
  attachments: string[]
  embeds: any[]
  components?: any[]
  timestamp: number
  is_bot: boolean
}

export interface TranscriptMessageProps {
  message: transcript_message
}

function render_embed(embed: any, index: number) {
  if (!embed) return null
  
  return (
    <div key={index} className="mt-2 border-l-4 border-blue-500 bg-accent/30 p-3 rounded-r">
      {embed.title && (
        <div className="font-semibold text-sm mb-1">{embed.title}</div>
      )}
      {embed.description && (
        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{embed.description}</div>
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
      {embed.footer && (
        <div className="mt-2 text-xs text-muted-foreground">{embed.footer.text}</div>
      )}
    </div>
  )
}

function render_component(component: any, index: number): any {
  if (!component) return null
  
  // - TYPE 17 - container \\ 
  if (component.type === 17) {
    return (
      <div key={`container-${index}`} className="my-1">
        {component.components?.map((child: any, idx: number) => render_component(child, idx))}
      </div>
    )
  }
  
  // - TYPE 10 - text/markdown \\ 
  if (component.type === 10) {
    return (
      <div key={`text-${index}`} className="prose prose-invert max-w-none">
        {component.content?.split('\n').map((line: string, idx: number) => {
          if (line.startsWith('```') && line.includes('```', 3)) {
            const match = line.match(/```(\w+)?\n?([\s\S]*?)```/)
            if (match) {
              const code = match[2]
              return (
                <pre key={idx} className="bg-gray-900 p-3 rounded my-2 overflow-x-auto">
                  <code className="text-sm text-gray-300">{code}</code>
                </pre>
              )
            }
          }
          if (line.startsWith('##')) {
            return <h2 key={idx} className="text-lg font-semibold text-white mt-2 mb-1">{line.replace(/^##\s*/, '')}</h2>
          }
          return line ? <p key={idx} className="text-gray-300 my-1">{line}</p> : <br key={idx} />
        })}
      </div>
    )
  }
  
  // - TYPE 14 - spacing \\ 
  if (component.type === 14) {
    const spacing = component.spacing || 1
    return <div key={`spacing-${index}`} style={{ marginTop: `${spacing * 0.25}rem` }} />
  }
  
  // - TYPE 1 - action row \\ 
  if (component.type === 1) {
    return (
      <div key={`action-row-${index}`} className="mt-2 flex flex-wrap gap-2">
        {component.components?.map((btn: any, idx: number) => {
          if (btn.type === 2) {
            const style_class = btn.style === 1 ? 'bg-blue-500/20 text-blue-500 border-blue-500/50' :
                               btn.style === 2 ? 'bg-gray-500/20 text-gray-400 border-gray-500/50' :
                               btn.style === 3 ? 'bg-green-500/20 text-green-500 border-green-500/50' :
                               btn.style === 4 ? 'bg-red-500/20 text-red-500 border-red-500/50' :
                               'bg-gray-500/20 text-gray-400 border-gray-500/50'
            
            return (
              <div
                key={idx}
                className={`px-3 py-1.5 text-xs rounded border ${style_class}`}
              >
                {btn.label}
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

export function TranscriptMessage({ message }: TranscriptMessageProps) {
  const date = new Date(message.timestamp * 1000)
  const time_str = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex gap-4 p-4 hover:bg-accent/50 transition-colors">
      <div className="flex-shrink-0">
        <img
          src={message.author_avatar}
          alt={message.author_tag}
          className="w-10 h-10 rounded-full"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={cn(
            "font-semibold",
            message.is_bot && "text-blue-500"
          )}>
            {message.author_tag}
          </span>
          {message.is_bot && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded flex items-center gap-1">
              <Bot className="w-3 h-3" />
              BOT
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {time_str}
          </span>
        </div>
        {message.content && (
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
        )}
        {message.attachments.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {message.attachments.map((url, i) => {
              const is_image = /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
              
              if (is_image) {
                return (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 max-w-md"
                  >
                    <img 
                      src={url} 
                      alt={`Attachment ${i + 1}`}
                      className="rounded border border-border max-h-96 object-contain"
                    />
                  </a>
                )
              }
              
              return (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                >
                  <Paperclip className="w-4 h-4" />
                  Attachment {i + 1}
                </a>
              )
            })}
          </div>
        )}
        {message.embeds && message.embeds.length > 0 && (
          <div className="mt-1">
            {message.embeds.map((embed, i) => render_embed(embed, i))}
          </div>
        )}
        {message.components && message.components.length > 0 && (
          <div className="mt-1">
            {message.components.map((component, i) => render_component(component, i))}
          </div>
        )}
      </div>
    </div>
  )
}
