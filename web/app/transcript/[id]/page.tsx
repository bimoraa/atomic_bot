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
      <div className="max-w-4xl mx-auto p-2 sm:p-4 md:p-6">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 sm:p-4 md:p-6 bg-accent/30 border-b border-border">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">Ticket Transcript</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <p className="text-muted-foreground text-[10px] sm:text-xs mb-1">Ticket ID</p>
                <p className="font-mono text-xs sm:text-sm">{transcript.ticket_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] sm:text-xs mb-1">Type</p>
                <p className="capitalize text-xs sm:text-sm">{transcript.ticket_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] sm:text-xs mb-1">Owner</p>
                <p className="text-xs sm:text-sm">{transcript.owner_tag}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Claimed By</p>
                <p>{transcript.claimed_by || 'Not claimed'}</p>
              </div>
              {transcript.issue_type && (
                <div>
                  <p className="text-muted-foreground">Issue Type</p>
                  <p>{transcript.issue_type}</p>
                </div>
              )}
              {transcript.description && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Description</p>
                  <p className="mt-1">{transcript.description}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Opened</p>
                <p>{open_date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Closed</p>
                <p>{close_date}</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border">
            {transcript.messages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No messages in this transcript
              </div>
            ) : (
              transcript.messages.map((message: any) => (
                <TranscriptMessage key={message.id} message={message} />
              ))
            )}
          </div>

          <div className="p-4 bg-accent/30 border-t border-border text-center text-sm text-muted-foreground">
            <p>{transcript.messages.length} message(s) • Transcript ID: {transcript.transcript_id}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
