/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useManageContext } from '../context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2, ShieldCheck, Hash, Users, TriangleAlert } from 'lucide-react'

// - TYPES - \\

interface settings_data {
  bypass_enabled: string
  bypass_channel: string
  bypass_disabled_reason: string
  bypass_roles: string[]
}

// - DANGER ZONE SECTION - \\

function DangerZone({ guild_id }: { guild_id: string }) {
  const [count, set_count] = useState<number | null>(null)
  const [deleting, set_deleting] = useState(false)
  const [confirm, set_confirm] = useState(false)
  const [done, set_done] = useState(false)

  const fetch_count = useCallback(async () => {
    try {
      const r = await fetch(`/api/bot-dashboard/${guild_id}/logs?limit=1&offset=0`)
      const data = await r.json()
      set_count(data.total ?? 0)
    } catch {
      set_count(null)
    }
  }, [guild_id])

  useEffect(() => { fetch_count() }, [fetch_count])

  const handle_delete = async () => {
    set_deleting(true)
    try {
      const r = await fetch(`/api/bot-dashboard/${guild_id}/logs`, { method: 'DELETE' })
      if (r.ok) {
        set_done(true)
        set_count(0)
        set_confirm(false)
      }
    } catch {
      // - non-critical - \\
    } finally {
      set_deleting(false)
    }
  }

  return (
    <div className="bg-card border border-red-900/40 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-red-900/30 bg-red-950/20">
        <div className="flex items-center gap-2">
          <TriangleAlert className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-medium text-red-400">Danger Zone</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Actions in this section are irreversible. Proceed with caution.
        </p>
      </div>

      <div className="px-6 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-medium text-foreground">Clear all bypass logs</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently delete all activity logs for this server.
              {count !== null && count > 0 && (
                <span className="text-red-400 ml-1">{count.toLocaleString()} entries will be removed.</span>
              )}
              {count === 0 && <span className="ml-1">No logs to delete.</span>}
            </p>
          </div>

          {!confirm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => set_confirm(true)}
              disabled={count === 0}
              className="border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300 gap-1.5 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete all logs
            </Button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">Are you sure?</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => set_confirm(false)}
                disabled={deleting}
                className="text-xs h-7 px-2"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handle_delete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white gap-1.5 h-7 px-3 text-xs"
              >
                {deleting
                  ? <><Loader2 className="w-3 h-3 animate-spin" />Deleting...</>
                  : <><Trash2 className="w-3 h-3" />Confirm delete</>
                }
              </Button>
            </div>
          )}
        </div>

        {done && (
          <p className="text-xs text-green-500 mt-3">All logs have been deleted.</p>
        )}
      </div>
    </div>
  )
}

// - PAGE - \\

export default function SettingsPage() {
  const { guild_id, guild } = useManageContext()

  const [settings, set_settings] = useState<settings_data | null>(null)
  const [loading, set_loading] = useState(true)

  const fetch_settings = useCallback(async () => {
    try {
      const r = await fetch(`/api/bot-dashboard/${guild_id}/settings`)
      const data = await r.json()
      set_settings(data.settings ?? {})
    } catch {
      // - non-critical - \\
    } finally {
      set_loading(false)
    }
  }, [guild_id])

  useEffect(() => { fetch_settings() }, [fetch_settings])

  const roles_count = Array.isArray(settings?.bypass_roles)
    ? settings.bypass_roles.length
    : 0

  return (
    <div className="px-6 py-6 space-y-6">

      {/* - HEADER - \\ */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Server-level configuration for {guild?.name ?? 'this server'}.
        </p>
      </div>

      {/* - SERVER INFO - \\ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Server information</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Read-only overview of this server&apos;s bypass setup.</p>
        </div>

        <div className="divide-y divide-border">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {guild?.icon
                ? <img src={`https://cdn.discordapp.com/icons/${guild_id}/${guild.icon}.webp?size=32`} alt="" className="w-5 h-5 rounded-full" />
                : <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center"><span className="text-[9px] text-muted-foreground">{guild?.name?.[0] ?? '?'}</span></div>
              }
              <span className="text-sm text-foreground">{guild?.name ?? 'Unknown Server'}</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">{guild_id}</span>
          </div>

          {loading ? (
            <div className="px-6 py-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading configuration...
            </div>
          ) : (
            <>
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4" />
                  Bypass status
                </div>
                <Badge
                  variant="outline"
                  className={settings?.bypass_enabled === 'true'
                    ? 'border-green-800 text-green-400 bg-green-900/20 text-[11px]'
                    : 'border-zinc-700 text-zinc-400 bg-zinc-800/30 text-[11px]'
                  }
                >
                  {settings?.bypass_enabled === 'true' ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="w-4 h-4" />
                  Bypass channel
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {settings?.bypass_channel ? `#${settings.bypass_channel}` : 'Not configured'}
                </span>
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  Allowed roles
                </div>
                <span className="text-xs text-muted-foreground">
                  {roles_count > 0 ? `${roles_count} role${roles_count !== 1 ? 's' : ''}` : 'All roles allowed'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* - DANGER ZONE - \\ */}
      <DangerZone guild_id={guild_id} />

    </div>
  )
}
