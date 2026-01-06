import { get_transcript } from '@/lib/db'
import { TranscriptMessage } from '@/components/transcript-message'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function TranscriptPage({
  params,
}: {
  params: { id: string }
}) {
  // - Check authentication - \\
  const cookie_store = cookies()
  const discord_user = cookie_store.get('discord_user')
  
  if (!discord_user) {
    redirect(`/login?return_to=/transcript/${params.id}`)
  }

  const transcript = await get_transcript(params.id)

  if (!transcript) {
    notFound()
  }

  const open_date = new Date(transcript.open_time * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const close_date = new Date(transcript.close_time * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* - HEADER CARD - \\ */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-6 shadow-sm">
          <div className="p-4 sm:p-6 border-b border-border bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold mb-2">Ticket Transcript</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Complete conversation history</p>
              </div>
              <div className="bg-primary/10 px-3 py-1.5 rounded-lg">
                <p className="text-xs font-medium text-primary">{transcript.ticket_type}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* - TICKET IDS - \\ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Ticket ID</p>
                  <code className="text-xs font-mono block break-all">{transcript.ticket_id}</code>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Transcript ID</p>
                  <code className="text-xs font-mono block break-all">{transcript.transcript_id}</code>
                </div>
              </div>

              {/* - TICKET INFO GRID - \\ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Owner</p>
                  <p className="text-sm font-medium">{transcript.owner_tag}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Claimed By</p>
                  <p className="text-sm font-medium">{transcript.claimed_by || 'Not claimed'}</p>
                </div>
              </div>

              {/* - TIMESTAMPS - \\ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Opened</p>
                  <p className="text-sm">{open_date}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Closed</p>
                  <p className="text-sm">{close_date}</p>
                </div>
              </div>

              {/* - ISSUE TYPE - \\ */}
              {transcript.issue_type && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Issue Type</p>
                  <span className="text-xs font-medium">
                    {transcript.issue_type}
                  </span>
                </div>
              )}
              
              {/* - DESCRIPTION - \\ */}
              {transcript.description && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Description</p>
                  <p className="text-sm leading-relaxed">{transcript.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* - MESSAGES CARD - \\ */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-br from-background to-muted/20 px-4 sm:px-6 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-semibold">Messages</h2>
              <span className="text-xs text-muted-foreground">
                {transcript.messages.length} message{transcript.messages.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="divide-y divide-border">
            {transcript.messages.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-muted-foreground">
                <p className="text-sm">No messages in this transcript</p>
              </div>
            ) : (
              transcript.messages.map((message: any) => (
                <TranscriptMessage key={message.id} message={message} />
              ))
            )}
          </div>

          <div className="px-4 sm:px-6 py-3 bg-muted/30 border-t border-border">
            <p className="text-xs text-center text-muted-foreground">
              Transcript ID: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{transcript.transcript_id}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
