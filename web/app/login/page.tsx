'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [is_loading, set_is_loading] = useState(false)

  const handle_discord_login = () => {
    set_is_loading(true)
    window.location.href = '/api/auth/discord'
  }

  const get_error_message = (error_code: string) => {
    const errors: Record<string, string> = {
      no_code: 'Authorization code not received from Discord',
      token_failed: 'Failed to exchange authorization token',
      user_failed: 'Failed to retrieve user information',
      unknown: 'An unexpected error occurred during authentication',
    }
    return errors[error_code] || 'Authentication failed'
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-black border-[#333333]">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl font-semibold text-white">
            Sign in to continue
          </CardTitle>
          <CardDescription className="text-[#888888]">
            Authenticate with Discord to access transcripts
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="bg-[#1a1a1a] border-[#333333]">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-[#888888] text-sm">
                {get_error_message(error)}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handle_discord_login}
            disabled={is_loading}
            className="w-full bg-white hover:bg-[#fafafa] text-black font-medium h-11 disabled:opacity-50"
          >
            {is_loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Continue with Discord
              </>
            )}
          </Button>

          <p className="text-center text-xs text-[#666666]">
            By continuing, you agree to our{' '}
            <a href="#" className="text-[#888888] hover:text-white transition-colors underline-offset-4 hover:underline">
              Terms
            </a>
            {' '}and{' '}
            <a href="#" className="text-[#888888] hover:text-white transition-colors underline-offset-4 hover:underline">
              Privacy Policy
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
