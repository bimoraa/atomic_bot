# Atomic Bot
jangan karna aku bisa ngoding
kamu kira aku bisa hack akun pesnuk

## Commands

- **/music**
  - **/play** - Play a song from YouTube or Spotify
  - **/pause** - Pause the current song
  - **/resume** - Resume the paused song
  - **/skip** - Skip the current song
  - **/stop** - Stop music and clear the queue
  - **/queue** - Show the music queue
  - **/nowplaying** - Show the currently playing song
  - **/volume** - Set the music volume (0-100)
  - **/loop** - Set loop mode (off/track/queue)

- **/moderation**
  - **/ban** - Ban a member from the server
  - **/kick** - Kick a member from the server
  - **/timeout** - Timeout a member
  - **/warn** - Warn a member
  - **/warnings** - View warnings for a member
  - **/purge** - Delete multiple messages at once (1-100)

- **/reminder**
  - **/reminder** - Set a DM reminder
  - **/reminder-list** - List your active reminders
  - **/reminder-clear** - Clear all your reminders

- **/staff**
  - **/ask** - Ask a question to staff
  - **/get-answer-stats** - View answer stats for staff members
  - **/work-stats** - Check staff work statistics
  - **/loa** - View Leave of Absence panel
  - **/close-request** - Request to close purchase ticket with deadline

- **/server**
  - **/serverinfo** - Show server information
  - **/check_messages** - Check message count of a user in a channel
  - **/leave_threads** - Leave all threads/posts in a channel or forum
  - **/edit_rules** - Edit the server rules message
  - **/view_leaderboard** - View script execution leaderboard

- **/utility**
  - **/afk** - Set your AFK status
  - **/snipe** - Show the last deleted message in this channel
  - **/version** - Check Roblox version for specific platform
  - **/ping** - Check bot latency
  - **/get_role_permission** - Get role permissions information

- **/setup**
  - **/free_panel** - Setup free script panel
  - **/guide_panel** - Setup guide panel
  - **/guide_select_panel** - Setup guide selection panel
  - **/helper_panel** - Setup helper panel
  - **/purchase_panel** - Setup purchase panel
  - **/reaction_panel** - Setup reaction role panel
  - **/review_panel** - Setup review panel
  - **/rules_panel** - Setup rules panel
  - **/script_panel** - Setup script panel
  - **/script_price** - Setup script pricing
  - **/tempvoice_panel** - Setup temporary voice panel
  - **/ticket_panel** - Setup ticket panel

- **/testing**
  - **/test_roblox_update** - Test Roblox update notification system


## Structure

```
atomic_bot/
├─ src/
│  ├─ commands/
│  │  ├─ setup/
│  │  │  ├─ guide_panel.ts
│  │  │  ├─ guide_select_panel.ts
│  │  │  ├─ helper_panel.ts
│  │  │  ├─ purchase_panel.ts
│  │  │  ├─ reaction_panel.ts
│  │  │  ├─ review_panel.ts
│  │  │  ├─ rules_panel.ts
│  │  │  ├─ script_panel.ts
│  │  │  ├─ script_price.ts
│  │  │  ├─ tempvoice_panel.ts
│  │  │  └─ ticket_panel.ts
│  │  │
│  │  ├─ tools/
│  │  │  ├─ ask.ts
│  │  │  ├─ check_messages.ts
│  │  │  ├─ close_request.ts
│  │  │  ├─ devlog.ts
│  │  │  ├─ edit_rules.ts
│  │  │  ├─ get_answer_stats.ts
│  │  │  ├─ get_role_permission.ts
│  │  │  ├─ leave_threads.ts
│  │  │  ├─ move_channel.ts
│  │  │  ├─ role_add.ts
│  │  │  ├─ serverinfo.ts
│  │  │  ├─ set_discount.ts
│  │  │  ├─ stats.ts
│  │  │  ├─ submit_payment.ts
│  │  │  ├─ version.ts
│  │  │  ├─ view_leaderboard.ts
│  │  │  └─ work_stats.ts
│  │  │
│  │  └─ test/
│  │     └─ test_roblox_update.ts
│  │
│  ├─ interactions/
│  │  ├─ buttons/
│  │  │  ├─ ask/
│  │  │  ├─ close_request/
│  │  │  ├─ guide/
│  │  │  ├─ payment/
│  │  │  ├─ reaction/
│  │  │  ├─ review/
│  │  │  ├─ script/
│  │  │  ├─ tempvoice/
│  │  │  └─ ticket/
│  │  │
│  │  ├─ modals/
│  │  │  ├─ priority/
│  │  │  ├─ ticket/
│  │  │  ├─ ask_staff.ts
│  │  │  ├─ devlog.ts
│  │  │  ├─ edit_rules.ts
│  │  │  ├─ review.ts
│  │  │  ├─ script_redeem.ts
│  │  │  └─ tempvoice.ts
│  │  │
│  │  ├─ select_menus/
│  │  │  ├─ tempvoice/
│  │  │  ├─ version/
│  │  │  ├─ work_stats/
│  │  │  ├─ answer_stats.ts
│  │  │  ├─ guide_select.ts
│  │  │  └─ payment_method.ts
│  │  │
│  │  └─ shared/
│  │
│  ├─ functions/
│  │  ├─ unified_ticket/
│  │  ├─ channel_manager.ts
│  │  ├─ command_permissions.ts
│  │  ├─ luarmor.ts
│  │  ├─ message_counter.ts
│  │  ├─ permissions.ts
│  │  ├─ roblox_update.ts
│  │  ├─ tempvoice.ts
│  │  ├─ ticket_manager.ts
│  │  └─ work_tracker.ts
│  │
│  ├─ events/
│  │  ├─ guild_member_add.ts
│  │  ├─ interaction_create.ts
│  │  └─ voice_state_update.ts
│  │
│  ├─ handlers/
│  │
│  ├─ configuration/
│  │
│  ├─ types/
│  │
│  ├─ utils/
│  │  ├─ array.ts
│  │  ├─ async.ts
│  │  ├─ cache.ts
│  │  ├─ collection.ts
│  │  ├─ components.ts
│  │  ├─ database.ts
│  │  ├─ discord_api.ts
│  │  ├─ env.ts
│  │  ├─ file.ts
│  │  ├─ format.ts
│  │  ├─ function.ts
│  │  ├─ http.ts
│  │  ├─ index.ts
│  │  ├─ logger.ts
│  │  ├─ math.ts
│  │  ├─ modal.ts
│  │  ├─ random.ts
│  │  ├─ string.ts
│  │  ├─ timestamp.ts
│  │  ├─ validator.ts
│  │  └─ version.ts
│  │
│  ├─ guide/
│  ├─ permissions/
│  └─ index.ts
│
├─ assets/
│  └─ images/
│
├─ .github/
│  └─ instructions/
│
├─ .env
├─ .env.example
├─ .gitignore
├─ package.json
├─ tsconfig.json
├─ LICENSE.txt
└─ README.md
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

3. Build & run:
```bash
npm run build
npm start
```

## Tech Stack

- TypeScript
- Discord.js
- Node.js
