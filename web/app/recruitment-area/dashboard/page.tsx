/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useState, useEffect, type ChangeEvent, type ChangeEventHandler } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle }          from "@/components/ui/card"
import { Label }                                                              from "@/components/ui/label"
import { Switch }                                                             from "@/components/ui/switch"
import { Button }                                                             from "@/components/ui/button"
import { Loader2 }                                                            from 'lucide-react'
import { Badge }                                                              from "@/components/ui/badge"
import { Icon }                                                               from '@iconify/react'
import { Calendar }                                                           from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger }   from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }     from "@/components/ui/select"
import { Input }                                                              from "@/components/ui/input"
import { Skeleton }                                                           from "@/components/ui/skeleton"

function handle_calendar_change(
  value: string | number,
  event: ChangeEventHandler<HTMLSelectElement>,
) {
  const new_event = { target: { value: String(value) } } as ChangeEvent<HTMLSelectElement>
  event(new_event)
}

interface DatePickerDialogProps {
  value      : Date | undefined
  onChange   : (d: Date | undefined) => void
  placeholder: string
}

function DatePickerDialog({ value, onChange, placeholder }: DatePickerDialogProps) {
  const [open,  set_open]  = useState(false)
  const [month, set_month] = useState<Date>(value ?? new Date())

  const display = value
    ? value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : placeholder

  return (
    <Dialog open={open} onOpenChange={set_open}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-11 justify-start bg-zinc-900/50 border-border/40 text-left font-normal text-white hover:bg-zinc-800 hover:text-white"
        >
          <Icon icon="solar:calendar-bold-duotone" width={16} height={16} className="mr-2 text-zinc-400" />
          <span className={value ? 'text-white' : 'text-zinc-500'}>{display}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[298px] bg-zinc-950 border-border/40">
        <DialogHeader>
          <DialogTitle className="text-white">Select Date</DialogTitle>
        </DialogHeader>
        <Calendar
          captionLayout="dropdown"
          className="rounded-md border border-border/40"
          components={{
            MonthCaption: (props) => <>{props.children}</>,
            DropdownNav: (props) => (
              <div className="flex w-full items-center gap-2">{props.children}</div>
            ),
            Dropdown: (props) => (
              <Select
                onValueChange={(val) => {
                  if (props.onChange) handle_calendar_change(val, props.onChange)
                }}
                value={String(props.value)}
              >
                <SelectTrigger className="first:flex-1 last:shrink-0 bg-zinc-900 border-border/40 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-border/40">
                  {props.options?.map((option) => (
                    <SelectItem
                      disabled={option.disabled}
                      key={option.value}
                      value={String(option.value)}
                      className="text-zinc-300"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ),
          }}
          hideNavigation
          mode="single"
          month={month}
          onMonthChange={set_month}
          onSelect={(d) => { onChange(d); set_open(false) }}
          selected={value}
        />
      </DialogContent>
    </Dialog>
  )
}

export default function RecruitmentDashboard() {
  const [loading,       set_loading]       = useState(true)
  const [saving,        set_saving]        = useState(false)
  const [settings,      set_settings]      = useState<any>(null)
  const [pending_count, set_pending_count] = useState(0)
  const [total_count,   set_total_count]   = useState(0)

  useEffect(() => {
    fetch('/api/recruitment-settings')
      .then(r => r.json())
      .then(data => {
        set_settings(data)
        set_loading(false)
      })
      .catch(err => {
        console.error(err)
        set_loading(false)
      })
  }, [])

  useEffect(() => {
    fetch('/api/recruitment-applications')
      .then(r => r.ok ? r.json() : [])
      .then((apps: any[]) => {
        set_total_count(apps.length)
        set_pending_count(apps.filter((a: any) => !a.flag || a.flag === 'pending').length)
      })
      .catch(() => {})
  }, [])

  const save_settings = async () => {
    set_saving(true)
    try {
      const res = await fetch('/api/recruitment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      const updated = await res.json()
      set_settings(updated)
    } catch (err) {
      console.error(err)
    }
    set_saving(false)
  }

  if (loading || !settings) {
    return (
      <div className="flex flex-col space-y-4 p-8">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    )
  }

  const statistics_cards = [
    {
      title: 'Wave Number',
      subtitle: `Wave ${settings.wave_number}`,
      cardIcon: 'solar:flag-bold-duotone',
      badgeColor: 'bg-purple-500/10 text-purple-400',
      statusValue: 'Current',
      statusIcon: 'solar:info-circle-line-duotone',
      subtext: 'Active phase'
    },
    {
      title: 'Status',
      subtitle: settings.is_open ? 'Open' : 'Closed',
      cardIcon: settings.is_open ? 'solar:check-circle-bold-duotone' : 'solar:close-circle-bold-duotone',
      badgeColor: settings.is_open ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400',
      statusValue: settings.is_open ? 'Accepting' : 'Paused',
      statusIcon: settings.is_open ? 'solar:check-read-line-duotone' : 'solar:stop-circle-line-duotone',
      subtext: 'Applications'
    },
    {
      title: 'Applications',
      subtitle: String(total_count),
      cardIcon: 'solar:document-text-bold-duotone',
      badgeColor: pending_count > 0 ? 'bg-orange-500/10 text-orange-400' : 'bg-zinc-800/50 text-zinc-400',
      statusValue: pending_count > 0 ? `${pending_count} pending` : 'All reviewed',
      statusIcon: pending_count > 0 ? 'solar:bell-bing-bold-duotone' : 'solar:check-circle-line-duotone',
      subtext: 'Submitted'
    },
    {
      title: 'Close Date',
      subtitle: settings.close_date ? new Date(settings.close_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set',
      cardIcon: 'solar:calendar-bold-duotone',
      badgeColor: 'bg-yellow-500/10 text-yellow-400',
      statusValue: settings.close_date ? 'Scheduled' : 'Open-ended',
      statusIcon: 'solar:calendar-mark-line-duotone',
      subtext: 'End date'
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Recruitment Control Panel</h2>
        <p className="text-muted-foreground text-sm">
          Manage recruitment waves, settings, and view all applicants.
        </p>
      </div>

      {/* --- STATISTICS CARDS --- */}
      <Card className="p-0 bg-zinc-950/40 border-border/40 overflow-hidden">
        <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap p-0">
          {statistics_cards.map((item, index) => {
            return (
              <div
                className="lg:w-3/12 md:w-6/12 w-full border-r border-border/40 last:border-r-0 border-b lg:border-b-0"
                key={index}
              >
                <div className="p-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <h5 className="text-sm font-medium text-zinc-400">{item.title}</h5>
                      <div className={`p-2 rounded-xl bg-zinc-900/50 border border-border/40 text-zinc-300`}>
                        <Icon icon={item.cardIcon} width={20} height={20} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      <h5 className="text-3xl font-bold text-white">{item.subtitle}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`${item.badgeColor} border-0 px-1.5 py-0 rounded-full font-medium flex items-center gap-1`}>
                          {item.statusValue}
                          <Icon icon={item.statusIcon} width={12} height={12} />
                        </Badge>
                        <p className="text-xs text-muted-foreground">{item.subtext}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* --- MAIN SETTINGS --- */}
      <Card className="bg-zinc-950/40 border-border/40">
        <CardHeader>
          <CardTitle className="text-xl text-white">Main Settings</CardTitle>
          <CardDescription>Configure the current recruitment wave</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/30 border border-border/40">
            <div className="space-y-0.5">
              <Label className="text-base text-white">Recruitment Status</Label>
              <p className="text-sm text-muted-foreground">
                Allow new applications to be submitted
              </p>
            </div>
            <Switch 
              checked={settings.is_open} 
              onCheckedChange={(c) => set_settings({ ...settings, is_open: c })}
              className="data-[state=checked]:bg-green-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label className="text-zinc-300">Wave Number</Label>
              <Input
                type="number"
                value={settings.wave_number}
                onChange={(e) => set_settings({ ...settings, wave_number: parseInt(e.target.value) })}
                className="bg-zinc-900/50 border-border/40 text-white h-11"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-zinc-300">Open Date (Optional)</Label>
              <DatePickerDialog
                value={settings.open_date ? new Date(settings.open_date) : undefined}
                onChange={(d) => set_settings({ ...settings, open_date: d ? d.getTime() : null })}
                placeholder="Pick open date"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-zinc-300">Close Date (Optional)</Label>
              <DatePickerDialog
                value={settings.close_date ? new Date(settings.close_date) : undefined}
                onChange={(d) => set_settings({ ...settings, close_date: d ? d.getTime() : null })}
                placeholder="Pick close date"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button 
              onClick={save_settings} 
              disabled={saving}
              className="bg-white text-black hover:bg-zinc-200 px-8"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
