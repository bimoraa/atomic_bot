'use client'

import { useManageContext } from '../context'
import { Card, CardContent,
         CardHeader, CardTitle } from '@/components/ui/card'
import { Settings2 }             from 'lucide-react'

export default function SettingsPage() {
  const { guild } = useManageContext()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Additional server settings for {guild?.name ?? 'this server'}.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Settings2 className="w-4 h-4" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No additional settings available.</p>
        </CardContent>
      </Card>
    </div>
  )
}
