/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Clock } from "lucide-react"

export default function StaffActivityPage() {
  return (
    <div className="flex-1 space-y-6 lg:p-10 p-4 md:p-8 pt-6 pb-20 dark text-foreground bg-background min-h-full selection:bg-primary/20">
      
      {/* - HEADER - \\ */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Staff Activity</h2>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Real-time monitoring of active staff
          </p>
        </div>
      </div>

      {/* - CONTENT - \\ */}
      <Card className="bg-zinc-950/40 border-border/40 backdrop-blur-sm shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" /> Live Feed
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Recent actions taken by staff members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { id: 1, action: "Closed ticket #ticket-4562", staff: "Admin_1", time: "2 mins ago" },
              { id: 2, action: "Deleted a message in #general", staff: "Mod_2", time: "18 mins ago" },
              { id: 3, action: "Issued a warning to User_123", staff: "Mod_Top", time: "1 hour ago" },
              { id: 4, action: "Created backup snapshot", staff: "Dev_Lead", time: "3 hours ago" },
              { id: 5, action: "Assigned helper role to John", staff: "Admin_1", time: "5 hours ago" },
            ].map(row => (
              <div key={row.id} className="flex items-start justify-between pb-4 border-b border-border/20 last:border-0 last:pb-0 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-xs font-bold text-zinc-300">
                    {row.staff.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-200">
                      <strong className="text-zinc-100 font-bold">{row.staff}</strong> {row.action}
                    </span>
                    <span className="text-[11px] flex items-center gap-1 text-zinc-500 mt-0.5">
                      <Clock className="w-3 h-3" /> {row.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}