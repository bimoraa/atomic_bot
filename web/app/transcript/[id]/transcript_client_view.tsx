/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

"use client"

import { useState } from 'react'
import { TranscriptMessage } from '@/components/features/transcript/transcript_message'
import { Ticket, User, UserCheck, Clock, CheckCircle2, Search, Bell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AtomicLogo } from '@/components/icons/atomic_logo'

export function TranscriptClientView({ 
  transcript, 
  user_data 
}: { 
  transcript: any
  user_data: any 
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [hide_bot, set_hide_bot]      = useState(false)

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

  const stats = [
    {
        title: 'Owner',
        subtitle: transcript.owner_tag,
        icon: User,
    },
    {
        title: 'Claimed By',
        subtitle: transcript.claimed_by || 'Not claimed',
        icon: UserCheck,
    },
    {
        title: 'Opened',
        subtitle: open_date,
        icon: Clock,
    },
    {
        title: 'Closed',
        subtitle: close_date,
        icon: CheckCircle2,
    },
  ];

  const filtered_messages = transcript.messages.filter((msg: any) => {
    if (hide_bot && msg.is_bot) return false

    if (!searchQuery) return true;
    
    const search_lower = searchQuery.toLowerCase();
    const content_match = msg.content?.toLowerCase().includes(search_lower);
    const author_match = msg.author?.username?.toLowerCase().includes(search_lower);
    
    // Check inside embeds too
    const embed_match = msg.embeds?.some((embed: any) => {
      const title = embed.title?.toLowerCase() || '';
      const desc = embed.description?.toLowerCase() || '';
      const author = embed.author?.name?.toLowerCase() || '';
      const fields = embed.fields?.some((f: any) => 
        f.name?.toLowerCase().includes(search_lower) || 
        f.value?.toLowerCase().includes(search_lower)
      );
      
      return title.includes(search_lower) || 
             desc.includes(search_lower) || 
             author.includes(search_lower) || 
             fields;
    });

    return content_match || author_match || embed_match;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* SHADCN SPACE SIMILAR TOPBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 md:px-6 w-full max-w-7xl mx-auto justify-between">
          {/* LEFT: Branding/Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center">
              <AtomicLogo className="w-5 h-5 text-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight hidden sm:inline-block text-foreground">Atomicals's<span className="text-[#888] font-normal"> Guard</span></span>
          </div>

          {/* MIDDLE: Search (Hidden on very small screens) */}
          <div className="hidden md:flex flex-1 items-center justify-center max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search messages..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted/50 border-border/50 pl-9 rounded-full h-9 text-sm focus-visible:ring-1 focus-visible:bg-background"
              />
            </div>
          </div>

          {/* RIGHT: Actions & Profile */}
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <Checkbox
                id="hide_bot"
                checked={hide_bot}
                onCheckedChange={(v) => set_hide_bot(v === true)}
                className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 focus-visible:ring-blue-500/20"
              />
              <Label htmlFor="hide_bot" className="text-sm text-muted-foreground cursor-pointer select-none whitespace-nowrap">
                Hide BOT messages
              </Label>
            </div>

            <div className="h-4 w-px bg-border/40 mx-1 hidden sm:block"></div>

            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
            </Button>
            
            <div className="h-4 w-px bg-border/40 mx-1 hidden sm:block"></div>

            <button className="flex items-center gap-2 rounded-full p-1 pl-1.5 pr-3 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50 focus:outline-none">
              <Avatar className="h-7 w-7 border border-border/50">
                <AvatarImage src={user_data?.avatar ? `https://cdn.discordapp.com/avatars/${user_data.id}/${user_data.avatar}.png` : ''} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">{user_data?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground/90 hidden sm:block">
                {user_data?.username || 'User'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 w-full pt-8 pb-24">
        <div className="max-w-4xl mx-auto px-4 w-full">
          
          {/* Mobile search - visible only on small screens */}
          <div className="w-full md:hidden relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search messages..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/50 border-border/50 pl-9 rounded-full h-9 text-sm focus-visible:ring-1 focus-visible:bg-background"
            />
          </div>
          {/* Mobile hide bot toggle */}
          <div className="flex sm:hidden items-center gap-2 mb-5">
            <Checkbox
              id="hide_bot_mobile"
              checked={hide_bot}
              onCheckedChange={(v) => set_hide_bot(v === true)}
              className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 focus-visible:ring-blue-500/20"
            />
            <Label htmlFor="hide_bot_mobile" className="text-sm text-muted-foreground cursor-pointer select-none">
              Hide BOT messages
            </Label>
          </div>

          {/* STATISTICS CARD - Styled to requested layout */}
          <Card className="p-0 border-border/40 bg-[#0c0c0c] mb-5 rounded-lg shadow-sm">
              <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0 py-0">
                  {stats.map((item, index) => {
                      const IconComponent = item.icon;
                      return (
                          <div
                              className="lg:w-3/12 md:w-6/12 w-full border-b md:border-b-0 border-e-0 md:border-e border-border/40 last:border-b-0 last:border-e-0 lg:[&:nth-child(2)]:border-e lg:[&:nth-child(3)]:border-e md:[&:nth-child(2)]:border-e-0"
                              key={index}
                          >
                              <div className="p-4">
                                  <div className="flex flex-col gap-0.5">
                                      <div className="flex justify-between items-start">
                                          <h5 className="text-sm font-medium text-[#888]">{item.title}</h5>
                                          <div className="p-1.5 rounded-full border border-border/20 text-foreground/60 bg-white/[0.02]">
                                              <IconComponent width={14} height={14} />
                                          </div>
                                      </div>
                                      <div className="flex flex-col gap-1 mt-1">
                                          <h5 className="text-lg font-semibold text-white truncate leading-tight" title={item.subtitle}>
                                              {item.subtitle}
                                          </h5>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </CardContent>
          </Card>

          {/* MESSAGES SECTION */}
          <div className="bg-[#0c0c0c] border border-border/40 overflow-hidden shadow-sm rounded-xl">
            {filtered_messages.length === 0 ? (
              <div className="py-12 text-center text-[#888] text-sm font-medium">
                {searchQuery ? "No messages found matching your search." : "No messages recorded in this transcript."}
              </div>
            ) : (
              <div className="flex flex-col">
                {filtered_messages.map((message: any) => (
                  <TranscriptMessage key={message.id} message={message} transcript_id={transcript.transcript_id} ticket_type={transcript.ticket_type} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
