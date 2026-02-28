'use client'

import { useEffect, useState, useCallback } from 'react'
import { useManageContext }                  from '../context'
import { Tabs }                              from '@/components/ui/tabs'
import { Button }                            from '@/components/ui/button'
import { Badge }                             from '@/components/ui/badge'
import { ScrollArea }                        from '@/components/ui/scroll-area'
import {
  Popover, PopoverContent, PopoverTrigger,
}                                            from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
}                                            from '@/components/ui/command'
import { Check, ChevronsUpDown, Hash,
         Loader2, Shield, X,
         CheckIcon, XIcon }              from 'lucide-react'
import { cn }                            from '@/lib/utils'

// - TYPES - \\

interface discord_channel { id: string; name: string; type: number; parent_id: string | null; position: number }
interface channel_category { id: string; name: string }
interface guild_settings_api {
  settings: {
    bypass_channel?       : string
    bypass_enabled?       : string
    bypass_disabled_reason?: string
    bypass_roles?         : string[]
  }
}
interface discord_role { id: string; name: string; color: number; position: number }

// - BYPASS CHANNEL TAB - \\

function BypassChannelTab({ guild_id }: { guild_id: string }) {
  const [channels, set_channels]             = useState<discord_channel[]>([])
  const [categories, set_categories]         = useState<channel_category[]>([])
  const [selected, set_selected]             = useState<string>('')
  const [open, set_open]                     = useState(false)
  const [loading, set_loading]               = useState(true)
  const [saving, set_saving]                 = useState(false)
  const [saved_channel, set_saved_channel]   = useState<string>('')

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
    } catch {
      // - non-critical - \\
    } finally {
      set_loading(false)
    }
  }, [guild_id])

  useEffect(() => { load() }, [load])

  const save = useCallback(async () => {
    set_saving(true)
    try {
      await fetch(`/api/bot-dashboard/${guild_id}/settings`, {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({ bypass_channel: selected }),
      })
      set_saved_channel(selected)
    } catch {
      // - non-critical - \\
    } finally {
      set_saving(false)
    }
  }, [guild_id, selected])

  const clear = useCallback(async () => {
    set_saving(true)
    try {
      await fetch(`/api/bot-dashboard/${guild_id}/settings`, {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({ bypass_channel: '' }),
      })
      set_selected('')
      set_saved_channel('')
    } catch {
      // - non-critical - \\
    } finally {
      set_saving(false)
    }
  }, [guild_id])

  const text_channels = channels.filter(c => c.type === 0)

  const grouped = categories.map(cat => ({
    cat,
    children: text_channels
      .filter(c => c.parent_id === cat.id)
      .sort((a, b) => a.position - b.position),
  })).filter(g => g.children.length > 0)

  const no_cat = text_channels.filter(c => !c.parent_id).sort((a, b) => a.position - b.position)

  const selected_name = text_channels.find(c => c.id === selected)?.name

  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
      <Loader2 className="w-3 h-3 animate-spin" />
      Loading channels...
    </div>
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select the channel where bypass commands will be accepted.
      </p>

      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={set_open}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-72 justify-between text-sm font-normal"
            >
              {selected_name ? (
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                  {selected_name}
                </span>
              ) : (
                <span className="text-muted-foreground">Select a channel...</span>
              )}
              <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search channel..." className="h-8 text-sm" />
              <CommandList>
                <CommandEmpty>No channels found.</CommandEmpty>
                {no_cat.length > 0 && (
                  <CommandGroup heading="No Category">
                    {no_cat.map(c => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => { set_selected(c.id); set_open(false) }}
                        className="text-sm gap-1.5"
                      >
                        <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {c.name}
                        {selected === c.id && <Check className="ml-auto w-3.5 h-3.5 text-primary" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {grouped.map(g => (
                  <CommandGroup key={g.cat.id} heading={g.cat.name}>
                    {g.children.map(c => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => { set_selected(c.id); set_open(false) }}
                        className="text-sm gap-1.5"
                      >
                        <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {c.name}
                        {selected === c.id && <Check className="ml-auto w-3.5 h-3.5 text-primary" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          size="sm"
          onClick={save}
          disabled={saving || selected === saved_channel}
          className="text-xs h-9"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
        </Button>

        {saved_channel && (
          <Button
            size="sm"
            variant="ghost"
            onClick={clear}
            disabled={saving}
            className="text-xs h-9 text-muted-foreground hover:text-destructive"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {saved_channel && (
        <p className="text-xs text-muted-foreground">
          Current: <span className="font-mono text-foreground">#{selected_name ?? saved_channel}</span>
        </p>
      )}
    </div>
  )
}

// - ACCESS TAB - \\

function AccessTab({ guild_id }: { guild_id: string }) {
  const [enabled, set_enabled]               = useState(true)
  const [roles, set_roles]                   = useState<discord_role[]>([])
  const [bypass_roles, set_bypass_roles]     = useState<string[]>([])
  const [saved_roles, set_saved_roles]       = useState<string[]>([])
  const [open_roles, set_open_roles]         = useState(false)
  const [loading, set_loading]               = useState(true)
  const [saving, set_saving]                 = useState(false)

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
        set_enabled(data.settings?.bypass_enabled !== 'false')
        const r = data.settings?.bypass_roles ?? []
        set_bypass_roles(r)
        set_saved_roles(r)
      }
    } catch {
      // - non-critical - \\
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
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({ bypass_enabled: String(next) }),
      })
    } catch {
      set_enabled(!next)
    } finally {
      set_saving(false)
    }
  }, [guild_id])

  const save_roles = useCallback(async () => {
    set_saving(true)
    try {
      await fetch(`/api/bot-dashboard/${guild_id}/settings`, {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({ bypass_roles }),
      })
      set_saved_roles(bypass_roles)
    } catch {
      // - non-critical - \\
    } finally {
      set_saving(false)
    }
  }, [guild_id, bypass_roles])

  const toggle_role = (id: string) => {
    set_bypass_roles(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id],
    )
  }

  const role_name = (id: string) => roles.find(r => r.id === id)?.name ?? id

  const role_color = (hex: number) => {
    if (hex === 0) return undefined
    const h = hex.toString(16).padStart(6, '0')
    return `#${h}`
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
      <Loader2 className="w-3 h-3 animate-spin" />
      Loading settings...
    </div>
  )

  return (
    <div className="space-y-6">

      {/* - ENABLE / DISABLE - \\ */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">Bypass Enabled</p>
          <p className="text-xs text-muted-foreground">Allow members to use the bypass command</p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle bypass enabled"
          disabled={saving}
          onClick={() => toggle_enabled(!enabled)}
          className={cn(
            'relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
            enabled ? 'bg-primary' : 'bg-input/60'
          )}
        >
          <span
            className={cn(
              'pointer-events-none relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-lg ring-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
              enabled ? 'translate-x-7' : 'translate-x-0'
            )}
          >
            {enabled
              ? <CheckIcon className="size-3.5 text-primary" aria-hidden="true" />
              : <XIcon     className="size-3.5 text-muted-foreground" aria-hidden="true" />
            }
          </span>
        </button>
      </div>

      <div className="border-t border-border" />

      {/* - ROLE PICKER - \\ */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Role Access</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Restrict bypass to specific roles. Leave empty to allow all.
          </p>
        </div>

        <Popover open={open_roles} onOpenChange={set_open_roles}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-72 justify-between text-sm font-normal"
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                {bypass_roles.length > 0 ? `${bypass_roles.length} role(s) selected` : 'Select roles...'}
              </span>
              <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search role..." className="h-8 text-sm" />
              <CommandList>
                <CommandEmpty>No roles found.</CommandEmpty>
                <CommandGroup>
                  {roles.map(r => (
                    <CommandItem
                      key={r.id}
                      value={r.name}
                      onSelect={() => toggle_role(r.id)}
                      className="text-sm gap-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0 border border-border"
                        style={{ backgroundColor: role_color(r.color) ?? 'transparent' }}
                      />
                      <span className="truncate">{r.name}</span>
                      {bypass_roles.includes(r.id) && <Check className="ml-auto w-3.5 h-3.5 text-primary shrink-0" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {bypass_roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bypass_roles.map(id => (
              <Badge
                key={id}
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
                onClick={() => toggle_role(id)}
              >
                {role_name(id)}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={save_roles}
            disabled={saving || JSON.stringify(bypass_roles.sort()) === JSON.stringify([...saved_roles].sort())}
            className="text-xs h-9"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Roles'}
          </Button>
          {bypass_roles.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => set_bypass_roles([])}
              disabled={saving}
              className="text-xs h-9 text-muted-foreground"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// - PAGE - \\

export default function BypassManagementPage() {
  const { guild_id }             = useManageContext()
  const [active_tab, set_active] = useState('channel')

  const tab_items = [
    { title: 'Bypass Channel', value: 'channel' },
    { title: 'Access',         value: 'access'  },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bypass Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure bypass channel, access roles, and enable/disable state.</p>
      </div>

      <Tabs
        tabs={tab_items}
        active={active_tab}
        on_change={set_active}
        className="mb-6"
      />

      {active_tab === 'channel' && <BypassChannelTab guild_id={guild_id} />}
      {active_tab === 'access'  && <AccessTab guild_id={guild_id} />}
    </div>
  )
}
