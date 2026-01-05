# Discord OAuth Setup for Transcript Authentication

## Setup Steps

1. **Go to Discord Developer Portal**
   - Visit: https://discord.com/developers/applications
   - Login with your Discord account

2. **Create/Select Application**
   - Click "New Application" or select your existing bot application
   - Give it a name (e.g., "Atomic Bot Web")

3. **Get OAuth2 Credentials**
   - Go to "OAuth2" tab in left sidebar
   - Copy your **Client ID**
   - Click "Reset Secret" and copy your **Client Secret** (keep this private!)

4. **Add Redirect URI**
   - Still in OAuth2 tab, scroll to "Redirects"
   - Add redirect URL:
     - For local: `http://localhost:3000/api/auth/discord/callback`
     - For production: `https://your-domain.com/api/auth/discord/callback`
   - Click "Save Changes"

5. **Update Environment Variables**
   - Open `/web/.env.local`
   - Replace the placeholders:
     ```env
     DISCORD_CLIENT_ID=paste_your_client_id_here
     DISCORD_CLIENT_SECRET=paste_your_client_secret_here
     ```

6. **For Production Deployment**
   - Update `NEXT_PUBLIC_WEB_URL` to your production URL
   - Add the production redirect URI in Discord Developer Portal
   - Set environment variables in your hosting platform (Vercel/Railway)

## Testing

1. Start the web server: `npm run dev`
2. Visit: `http://localhost:3000/transcript/any-id`
3. You should be redirected to `/login`
4. Click "Login with Discord"
5. Authorize the app
6. You'll be redirected back to the transcript

## Security Notes

- Never commit `.env.local` to git
- Keep `DISCORD_CLIENT_SECRET` private
- Use HTTPS in production
- Session expires after 7 days
