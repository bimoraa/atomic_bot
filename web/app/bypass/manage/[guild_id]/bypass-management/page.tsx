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
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import {
  Check, ChevronsUpDown, Hash,
  Loader2, Shield, X,
  Save, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// - TYPES - \\

interface discord_channel { id: string; name: string; type: number; parent_id: string | null; position: number }
interface channel_category { id: string; name: string }
interface discord_role { id: string; name: string; color: number; position: number }

interface guild_settings_api {
  settings: {
    bypass_channel?: string
    bypass_enabled?: string
    bypass_disabled_reason?: string
    bypass_roles?: string[]
  }
}

// - STATUS SECTION - \\

function StatusSection({ guild_id }: { guild_id: string }) {
  const [enabled, set_enabled] = useState(true)
  const [reason, set_reason] = useState('')
  const [saved_reason, set_saved_reason] = useState('')
  const [loading, set_loading] = useState(true)
  const [saving, set_saving] = useState(false)

  const load = useCallback(async () => {
    set_loading(true)
    try {
      const r = await fetch(`/api/bot-dashboard/${guild_id}/settings`)
      if (r.ok) {
        const data: guild_settings_api = await r.json()
        set_enabled(data.settings?.bypass_enabled !== 'false')
        set_reason(data.settings?.bypass_disabled_reason ?? '')
        set_saved_reason(data.settings?.bypass_disabled_reason ?? '')
      }
    } finally {
      set_loading(false)
    }
  }, [guild_id])

  useEffect(() => { load() }, [load])

  const toggle_enabled = useCallback(async (next: boolean) => {
    set_enabled(next)
    set_saving(true)
    try {
      await fetch(`/api/bot-dashboard/${guild_id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypass_enabled: String(next) }),
      })
    } catch {
      set_enabled(!next)
    } finally {
      set_saving(false)
    }
  }, [guild_id])

  const save_reason = useCallback(async () => {
    set_saving(true)
    try {
      await fetch(`/api/bot-dashboard/${guild_id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypass_disabled_reason: reason }),
      })
      set_saved_reason(reason)
    } finally {
      set_saving(false)
    }
  }, [guild_id, reason])

  if (loading) return (
    <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 md:w-2/3 shrink-0">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
        <div className="shrink-0 flex items-center md:pb-6">
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden flex flex-col transition-all hover:border-border/80">
      <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 md:w-2/3 shrink-0">
          <h3 className="font-semibold text-foreground">Bypass Status</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enable or disable the bypass feature server-wide. When disabled, an optional reason message can be shown to members.
          </p>
        </div>
        <div className="shrink-0 flex items-center md:pb-6">
          <Switch
            checked={enabled}
            onCheckedChange={toggle_enabled}
            disabled={saving}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>
      {!enabled && (
        <div className="px-6 md:px-8 py-5 bg-muted/30 border-t border-border/50">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Disabled Reason</h4>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={reason}
                  onChange={e => set_reason(e.target.value)}
                  placeholder="e.g. Temporarily disabled for maintenance..."
                  maxLength={200}
                  className="w-full h-9 px-3 py-2 rounded-md border border-input/60 bg-background/50 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 transition-colors"
                />
              </div>
              <Button
                size="default"
                onClick={save_reason}
                disabled={saving || reason === saved_reason}
                className="h-9 w-full sm:w-auto gap-2 px-6"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-right">{reason.length} / 200</p>
          </div>
        </div>
      )}
    </div>
  )
}

// - CHANNEL SECTION - \\

function ChannelSection({ guild_id }: { guild_id: string }) {
  const [channels, set_channels] = useState<discord_channel[]>([])
  const [categories, set_categories] = useState<channel_category[]>([])
  const [selected, set_selected] = useState<string>('')
  const [saved_channel, set_saved_channel] = useState<string>('')
  const [open, set_open] = useState(false)
  const [loading, set_loading] = useState(true)
  const [saving, set_saving] = useState(false)

  const load = useCallback(async () => {
    set_loading(true)
    try {
      const [ch_res, set_res] = await Promise.all([
        fetch(`/api/bot-dashboard/${guild_id}/channels`),
        fetch(`/api/bot-dashboard/${guild_id}/settings`),
      ])
      if (ch_res.ok) {
        const data = await ch_res.json()
        set_channels(data.channels ?? [])
        set_categories(data.categories ?? [])
      }
      if (set_res.ok) {
        const data: guild_settings_api = await set_res.json()
        const ch = data.settings?.bypass_channel ?? ''
        set_selected(ch)
        set_saved_channel(ch)
      }
    } finally {
      set_loading(false)
    }
  }, [guild_id])

  useEffect(() => { load() }, [load])

  const save = useCallback(async () => {
    set_saving(true)
    try {
      await fetch(`/api/bot-dashboard/${guild_id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypass_channel: selected }),
      })
      set_saved_channel(selected)
    } finally {
      set_saving(false)
    }
  }, [guild_id, selected])

  const clear = useCallback(async () => {
    set_saving(true)
    try {
      await fetch(`/api/bot-dashboard/${guild_id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypass_channel: '' }),
      })
      set_selected('')
      set_saved_channel('')
    } finally {
      set_saving(false)
    }
  }, [guild_id])

  const text_channels = channels.filter(c => c.type === 0)
  const grouped = categories.map(cat => ({
    cat,
    children: text_channels.filter(c => c.parent_id === cat.id).sort((a, b) => a.position - b.position),
  })).filter(g => g.children.length > 0)
  const no_cat = text_channels.filter(c => !c.parent_id).sort((a, b) => a.position - b.position)
  const selected_name = text_channels.find(c => c.id === selected)?.name

  if (loading) return (
    <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="space-y-3 lg:w-1/3 shrink-0">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="flex-1 space-y-4 pt-1 flex flex-col justify-start">
          <Skeleton className="h-9 w-full sm:max-w-xs rounded-md" />
        </div>
      </div>
      <div className="px-6 md:px-8 py-4 bg-muted/30 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-9 w-full sm:w-32 rounded-md" />
      </div>
    </div>
  )

  return (
    <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden flex flex-col transition-all hover:border-border/80">
      <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="space-y-1.5 lg:w-1/3 shrink-0">
          <h3 className="font-semibold text-foreground">Bypass Channel</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Designate a specific channel where bypass commands will be accepted. Commands in other channels will be ignored.
          </p>
        </div>

        <div className="flex-1 space-y-4 pt-1">
          <div className="flex items-center gap-3">
            <Popover open={open} onOpenChange={set_open}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full sm:max-w-xs justify-between font-normal h-9 bg-background">
                  {selected_name ? (
                    <span className="flex items-center gap-2 text-foreground font-medium truncate">
                      <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{selected_name}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select a channel...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search channel..." className="h-9 border-none focus:ring-0" />
                  <CommandList>
                    <CommandEmpty>No channels found.</CommandEmpty>
                    {no_cat.length > 0 && (
                      <CommandGroup heading="No Category">
                        {no_cat.map(c => (
                          <CommandItem key={c.id} value={c.name} onSelect={() => { set_selected(c.id); set_open(false) }} className="text-sm gap-2">
                            <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{c.name}</span>
                            {selected === c.id && <Check className="ml-auto w-4 h-4 text-primary shrink-0" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {grouped.map(g => (
                      <CommandGroup key={g.cat.id} heading={g.cat.name}>
                        {g.children.map(c => (
                          <CommandItem key={c.id} value={c.name} onSelect={() => { set_selected(c.id); set_open(false) }} className="text-sm gap-2">
                            <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{c.name}</span>
                            {selected === c.id && <Check className="ml-auto w-4 h-4 text-primary shrink-0" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {saved_channel && (
              <Button variant="ghost" size="sm" onClick={clear} disabled={saving} className="h-9 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                Clear
              </Button>
            )}
          </div>

          {saved_channel && (
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground bg-muted/30 border border-border/40 py-2.5 px-3.5 rounded-lg inline-flex w-fit">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Current active channel: <span className="font-semibold text-foreground">#{selected_name ?? saved_channel}</span></span>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 md:px-8 py-4 bg-muted/30 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-[13px] text-muted-foreground pr-4">
          Remember to grant the bot <span className="font-medium text-foreground">View Channel</span> permission.
        </p>
        <Button size="default" onClick={save} disabled={saving || selected === saved_channel} className="h-9 w-full sm:w-auto px-6 whitespace-nowrap">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Changes
        </Button>
      </div>
    </div>
  )
}

// - ROLES SECTION - \\

function RolesSection({ guild_id }: { guild_id: string }) {
  const [roles, set_roles] = useState<discord_role[]>([])
  const [bypass_roles, set_bypass_roles] = useState<string[]>([])
  const [saved_roles, set_saved_roles] = useState<string[]>([])
  const [open_roles, set_open_roles] = useState(false)
  const [loading, set_loading] = useState(true)
  const [saving, set_saving] = useState(false)

  const load = useCallback(async () => {
    set_loading(true)
    try {
      const [role_res, set_res] = await Promise.all([
        fetch(`/api/bot-dashboard/${guild_id}/roles`),
        fetch(`/api/bot-dashboard/${guild_id}/settings`),
      ])
      if (role_res.ok) set_roles((await role_res.json()).roles ?? [])
      if (set_res.ok) {
        const data: guild_settings_api = await set_res.json()
        const r = data.settings?.bypass_roles ?? []
        set_bypass_roles(r)
        set_saved_roles(r)
      }
    } finally {
      set_loading(false)
    }
  }, [guild_id])

  useEffect(() => { load() }, [load])

  const save_roles = useCallback(async () => {
    set_saving(true)
    try {
      await fetch(`/api/bot-dashboard/${guild_id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypass_roles }),
      })
      set_saved_roles(bypass_roles)
    } finally {
      set_saving(false)
    }
  }, [guild_id, bypass_roles])

  const toggle_role = (id: string) =>
    set_bypass_roles(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])

  const role_name = (id: string) => roles.find(r => r.id === id)?.name ?? id
  const role_color = (hex: number) => hex === 0 ? undefined : `#${hex.toString(16).padStart(6, '0')}`

  const roles_changed = JSON.stringify([...bypass_roles].sort()) !== JSON.stringify([...saved_roles].sort())

  if (loading) return (
    <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="space-y-3 lg:w-1/3 shrink-0">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex-1 space-y-4 pt-1 flex flex-col justify-start">
          <Skeleton className="h-9 w-full sm:max-w-xs rounded-md" />
        </div>
      </div>
      <div className="px-6 md:px-8 py-4 bg-muted/30 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-full sm:w-32 rounded-md" />
      </div>
    </div>
  )

  return (
    <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden flex flex-col transition-all hover:border-border/80">
      <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="space-y-1.5 lg:w-1/3 shrink-0">
          <h3 className="font-semibold text-foreground">Role Access</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Restrict the bypass command to members with one or more specific roles. If empty, everyone can use it.
          </p>
        </div>

        <div className="flex-1 space-y-4 pt-1">
          <Popover open={open_roles} onOpenChange={set_open_roles}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:max-w-xs justify-between font-normal h-9 bg-background">
                <span className="flex items-center gap-2 truncate">
                  <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                  {bypass_roles.length > 0 ? (
                    <span className="font-medium text-foreground">{bypass_roles.length} role(s) selected</span>
                  ) : (
                    <span className="text-muted-foreground">Select roles...</span>
                  )}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search role..." className="h-9 border-none focus:ring-0" />
                <CommandList>
                  <CommandEmpty>No roles found.</CommandEmpty>
                  <CommandGroup>
                    {roles.map(r => (
                      <CommandItem key={r.id} value={r.name} onSelect={() => toggle_role(r.id)} className="text-sm gap-3 py-2 cursor-pointer">
                        <div
                          className="w-3 h-3 rounded-full shrink-0 border border-border"
                          style={{ backgroundColor: role_color(r.color) ?? 'transparent' }}
                        />
                        <span className="truncate flex-1">{r.name}</span>
                        {bypass_roles.includes(r.id) && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {bypass_roles.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {bypass_roles.map(id => (
                <Badge
                  key={id}
                  variant="secondary"
                  className="text-xs font-medium px-2.5 py-1.5 cursor-pointer bg-muted border border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all rounded-md flex items-center shadow-sm"
                  onClick={() => toggle_role(id)}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full mr-2 shrink-0 border border-border/50"
                    style={{ backgroundColor: role_color(roles.find(r => r.id === id)?.color ?? 0) ?? 'transparent' }}
                  />
                  <span className="truncate max-w-[120px]">{role_name(id)}</span>
                  <X className="w-3 h-3 ml-2 opacity-60" />
                </Badge>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground bg-muted/30 border border-border/40 py-2.5 px-3.5 rounded-lg inline-flex w-fit">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>No restrictions applied. <span className="font-semibold text-foreground">Everyone</span> can bypass.</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 md:px-8 py-4 bg-muted/30 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-[13px] text-muted-foreground pr-4">
          Modifications are applied instantly.
        </p>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {bypass_roles.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => set_bypass_roles([])} disabled={saving} className="h-9 px-4 text-muted-foreground hover:text-foreground">
              Clear All
            </Button>
          )}
          <Button size="default" onClick={save_roles} disabled={saving || !roles_changed} className="h-9 w-full sm:w-auto px-6 whitespace-nowrap">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}

// - PAGE - \\

export default function BypassManagementPage() {
  const { guild_id } = useManageContext()

  return (
    <div className="px-4 sm:px-6 py-6 md:py-10 mx-auto max-w-4xl space-y-8">

      <div className="space-y-1.5 px-1 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Bypass Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure bypass channel, access control, and master toggle for this server.
        </p>
      </div>

      <div className="space-y-6">
        <StatusSection guild_id={guild_id} />
        <ChannelSection guild_id={guild_id} />
        <RolesSection guild_id={guild_id} />
      </div>

    </div>
  )
}

