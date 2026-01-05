"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Calendar, 
  Hash, 
  Shield, 
  Activity
} from "lucide-react"

interface UserDialogProps {
  user_id: string
  open: boolean
  on_close: () => void
}

interface UserDetails {
  id: string
  username: string
  tag: string
  avatar: string
  banner: string | null
  bot: boolean
  nickname?: string
  display_name?: string
  roles: Array<{
    id: string
    name: string
    color: string
    icon: string | null
    position: number
  }>
  joined_at: number
  created_at: number
  premium_since?: number
}

export function UserDialog({ user_id, open, on_close }: UserDialogProps) {
  const [user, set_user] = useState<UserDetails | null>(null)
  const [loading, set_loading] = useState(false)

  const fetch_user = async () => {
    set_loading(true)
    try {
      const bot_url = process.env.NEXT_PUBLIC_BOT_URL || 'http://localhost:3456'
      
      const res = await fetch(`${bot_url}/api/member/${user_id}`)
      if (!res.ok) {
        set_user(null)
        return
      }

      const data = await res.json()
      set_user(data)
    } catch (error) {
      console.error('[ - USER DIALOG - ] Failed to fetch user:', error)
      set_user(null)
    } finally {
      set_loading(false)
    }
  }

  // - Fetch when dialog opens - \\
  if (open && !user && !loading) {
    fetch_user()
  }

  // - Format timestamp to readable date - \\
  /**
   * @param timestamp - Unix timestamp in milliseconds
   * @returns Formatted date string
   */
  const format_date = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // - Get hex color from integer - \\
  /**
   * @param color - Discord color integer
   * @returns Hex color string
   */
  const get_role_color = (color_hex: string) => {
    return color_hex || '#99aab5'
  }

  // - Calculate text color based on background brightness - \\
  /**
   * @param hex_color - Hex color string
   * @returns Black or white text color for best contrast
   */
  const get_text_color = (hex_color: string) => {
    if (!hex_color || hex_color === '#000000') return '#ffffff'
    
    const hex = hex_color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 155 ? '#000000' : '#ffffff'
  }

  const default_banner = 'https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_banner.png?raw=true'

  return (
    <Dialog open={open} onOpenChange={(is_open) => !is_open && on_close()}>
      <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden bg-[#0a0a0a] border border-[#1a1a1a] shadow-2xl">
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : user ? (
          <>
            {/* - BANNER - */}
            <div className="h-28 relative overflow-visible bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
              <img 
                src={user.banner || default_banner}
                alt="Banner"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute -bottom-14 left-6">
                <div className="relative">
                  <img 
                    src={user.avatar} 
                    alt={user.username}
                    className="w-28 h-28 rounded-full border-4 border-[#0a0a0a] shadow-lg bg-[#0a0a0a]"
                  />
                  {user.bot && (
                    <div className="absolute -bottom-1 -right-1 bg-[#0070f3] text-white text-[10px] font-semibold px-2.5 py-1 rounded-full border-2 border-[#0a0a0a] shadow-sm">
                      BOT
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* - CONTENT - */}
            <div className="pt-16 px-6 pb-6 space-y-5">
              {/* - USERNAME - */}
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  {user.display_name || user.username}
                </h2>
                <p className="text-sm text-[#888888] mt-0.5">@{user.username}</p>
                {user.nickname && user.nickname !== user.username && user.nickname !== user.display_name && (
                  <p className="text-xs text-[#666666] mt-1">aka {user.nickname}</p>
                )}
              </div>

              <Separator className="bg-[#1a1a1a]" />

              {/* - USER BIODATA - */}
              <div className="space-y-3">
                {/* - USER ID - */}
                <div className="flex items-start gap-3 text-sm">
                  <Hash className="w-4 h-4 text-[#666666] mt-0.5" />
                  <div className="flex-1">
                    <span className="text-[#888888] block text-xs mb-1">User ID</span>
                    <code className="px-2 py-1 rounded bg-[#1a1a1a] text-[#e0e0e0] font-mono text-xs border border-[#2a2a2a]">
                      {user.id}
                    </code>
                  </div>
                </div>

                {/* - MEMBER SINCE - */}
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-[#666666] mt-0.5" />
                  <div className="flex-1">
                    <span className="text-[#888888] block text-xs mb-1">Member Since</span>
                    <span className="text-white font-medium">{format_date(user.joined_at)}</span>
                  </div>
                </div>

                {/* - DISCORD USER SINCE - */}
                <div className="flex items-start gap-3 text-sm">
                  <User className="w-4 h-4 text-[#666666] mt-0.5" />
                  <div className="flex-1">
                    <span className="text-[#888888] block text-xs mb-1">Discord User Since</span>
                    <span className="text-white font-medium">{format_date(user.created_at)}</span>
                  </div>
                </div>

                {/* - BOOSTING SINCE - */}
                {user.premium_since && (
                  <div className="flex items-start gap-3 text-sm">
                    <Activity className="w-4 h-4 text-pink-500 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-[#888888] block text-xs mb-1">Boosting Since</span>
                      <span className="text-pink-400 font-medium">{format_date(user.premium_since)}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-[#1a1a1a]" />

              {/* - ROLES - */}
              {user.roles && user.roles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-[#666666]" />
                    <span className="text-[#888888] text-xs">Roles ({user.roles.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.roles
                      .sort((a, b) => b.position - a.position)
                      .map((role) => {
                        const bg_color = get_role_color(role.color)
                        const text_color = get_text_color(bg_color)
                        
                        return (
                          <Badge
                            key={role.id}
                            className="border-0 font-medium px-3 py-1.5 flex items-center gap-1.5 shadow-sm"
                            style={{ 
                              backgroundColor: bg_color,
                              color: text_color,
                            }}
                          >
                            {role.icon && (
                              <img src={role.icon} alt="" className="w-4 h-4 rounded-sm" />
                            )}
                            {role.name}
                          </Badge>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <p className="text-[#666666]">Failed to load user information</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
