import { cn } from "@/lib/utils"

export interface transcript_message {
  id: string
  author_id: string
  author_tag: string
  author_avatar: string
  content: string
  attachments: string[]
  embeds: any[]
  timestamp: number
  is_bot: boolean
}

export interface TranscriptMessageProps {
  message: transcript_message
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
            <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded">
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
            {message.attachments.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline"
              >
                📎 Attachment {i + 1}
              </a>
            ))}
          </div>
        )}
        {message.embeds.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {message.embeds.length} embed(s)
          </div>
        )}
      </div>
    </div>
  )
}
