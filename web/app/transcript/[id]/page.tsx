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
          <div className="p-6 border-b border-border">
            <h1 className="text-2xl font-semibold mb-6">Ticket Transcript</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Ticket ID</p>
                  <p className="font-mono text-sm bg-muted/50 px-3 py-1.5 rounded-md inline-block">{transcript.ticket_id}</p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Type</p>
                  <p className="text-sm font-medium capitalize">{transcript.ticket_type}</p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Owner</p>
                  <p className="text-sm font-medium">{transcript.owner_tag}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Claimed By</p>
                  <p className="text-sm font-medium">{transcript.claimed_by || 'Not claimed'}</p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Opened</p>
                  <p className="text-sm">{open_date}</p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Closed</p>
                  <p className="text-sm">{close_date}</p>
                </div>
              </div>

              {transcript.issue_type && (
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Issue Type</p>
                  <p className="text-sm font-medium">{transcript.issue_type}</p>
                </div>
              )}
              
              {transcript.description && (
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Description</p>
                  <p className="text-sm leading-relaxed mt-2">{transcript.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* - MESSAGES CARD - \\ */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="divide-y divide-border">
            {transcript.messages.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p className="text-sm">No messages in this transcript</p>
              </div>
            ) : (
              transcript.messages.map((message: any) => (
                <TranscriptMessage key={message.id} message={message} />
              ))
            )}
          </div>

          <div className="px-6 py-4 bg-muted/30 border-t border-border">
            <p className="text-xs text-center text-muted-foreground">
              {transcript.messages.length} message(s) • Transcript ID: <span className="font-mono">{transcript.transcript_id}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
