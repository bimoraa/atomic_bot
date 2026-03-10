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
import { Banknote, CreditCard, ChevronRight } from "lucide-react"

export default function SalaryPage() {
  return (
    <div className="flex-1 space-y-6 lg:p-10 p-4 md:p-8 pt-6 pb-20 dark text-foreground bg-background min-h-full selection:bg-primary/20">
      
      {/* - HEADER - \\ */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Salary Management</h2>
          <p className="text-muted-foreground text-sm">
            Distribute and log payments to staff for their work.
          </p>
        </div>
      </div>

      {/* - CONTENT - \\ */}
      <div className="grid gap-4 md:grid-cols-2 mt-6">
        
        <Card className="bg-zinc-950/40 border-border/40 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" /> Pending Payouts
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Staff who have accrued unpaid earnings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "John Doe", role: "Mod", amount: "Rp 500.000" },
                { name: "Alex", role: "Helper", amount: "Rp 250.000" },
                { name: "Support2", role: "Support", amount: "Rp 150.000" },
              ].map((staff, j) => (
                <div key={j} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800/60 bg-zinc-900/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 font-bold text-xs text-indigo-400">
                      {staff.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-200">{staff.name}</span>
                      <span className="text-[11px] text-zinc-500">{staff.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-zinc-300">{staff.amount}</span>
                    <button className="text-[10px] uppercase tracking-wider font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1.5 rounded transition-colors">
                      Pay
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-4 flex items-center justify-center gap-2 py-2 border border-zinc-800/80 rounded-md bg-zinc-900/50 hover:bg-zinc-800 text-sm font-medium transition-colors text-zinc-300">
              View All Accruals <ChevronRight className="w-4 h-4" />
            </button>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}