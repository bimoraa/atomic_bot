<div align="center">

<table border="0" cellspacing="0" cellpadding="0">
  <tr>
    <td valign="middle">
      <img src="https://github.com/bimoraa/atomic_bot/blob/main/assets/images/logo.png?raw=true" alt="Atomic Bot Logo" height="160" />
    </td>
    <td valign="middle" width="24"></td>
    <td valign="middle">
      <img src="https://github.com/bimoraa/atomic_bot/blob/main/assets/images/banner.png?raw=true" alt="Atomic Bot Banner" height="160" />
    </td>
  </tr>
</table>

<p>A multi-bot Discord platform for server management, automation,<br/>JKT48 live notifications, and link bypassing.</p>

[![Last Commit](https://img.shields.io/github/last-commit/bimoraa/atomic_bot?style=flat-square&color=5865F2)](https://github.com/bimoraa/atomic_bot/commits/main)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.19.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE.txt)

</div>

---

## Overview

| Bot | Description |
|---|---|
| **Atomic Bot** | Main server management — moderation, tickets, payments, music, reminders, and more |
| **JKT48 Bot** | Live stream notifications for JKT48 IDN & Showroom streams |
| **Bypass Bot** | Automatic link bypassing with DM and channel support |

---

## Prerequisites

- Node.js >= 20.19.0
- npm >= 10.0.0
- PostgreSQL database
- Discord Bot Token(s)

## Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Build
npm run build
```

## Running

```bash
# All bots at once
npm start

# Or individually
npm run start:atomic
npm run start:jkt48
npm run start:bypass
```

## Development

```bash
# All bots (watch mode)
npm run dev:all

# Individual
npm run dev:atomic
npm run dev:jkt48
npm run dev:bypass
```

## Project Structure

```
src/
├── index.ts                  # Multi-bot launcher
│
├── startup/                  # Per-bot entry points
│   ├── atomic_bot.ts
│   ├── jkt48_bot.ts
│   └── bypass_bot.ts
│
├── atomic_bot/               # Main server management bot
│   ├── core/
│   │   ├── client/
│   │   ├── handlers/
│   │   └── middleware/
│   ├── guide/                # Guide markdown files
│   ├── infrastructure/
│   │   ├── api/
│   │   ├── cache/
│   │   └── webhooks/
│   └── modules/
│       ├── moderation/       # Ban, kick, warn, mute
│       ├── music/            # DisTube playback
│       ├── tickets/          # Support ticket system
│       ├── payments/         # Payment handling
│       ├── reminder/         # Persistent reminders
│       ├── reputation/       # Rep system
│       ├── staff/            # Staff tools
│       ├── utility/          # General utilities
│       ├── whitelister/      # Whitelist management
│       └── ...
│
├── jkt48_bot/                # JKT48 live notification bot
│   ├── core/
│   │   ├── buttons/
│   │   ├── controllers/
│   │   └── schedulers/
│   ├── infrastructure/api/
│   └── modules/
│       ├── notify.ts
│       ├── notify_channel_set.ts
│       ├── history_live.ts
│       └── ...
│
├── bypass_bot/               # Link bypass bot
│   ├── core/
│   │   ├── buttons/
│   │   ├── events/           # Auto-bypass (DM + channel)
│   │   ├── limits/           # Rate limiting
│   │   └── select_menus/
│   └── modules/
│       ├── bypass.ts
│       ├── bypass_channel_set.ts
│       └── ...
│
├── shared/                   # Shared across all bots
│   ├── config/
│   ├── constants/
│   ├── database/
│   ├── services/
│   ├── types/
│   └── utils/
│
└── web/                      # Dashboard (Next.js)
    ├── app/
    └── components/
```

## Tech Stack

| Technology | Purpose |
|---|---|
| TypeScript | Language |
| Discord.js v14 | Discord API |
| Node.js | Runtime |
| PostgreSQL (`pg`) | Primary database |
| Express | Web server |
| Next.js | Web dashboard |
| DisTube | Music playback |
| concurrently | Multi-bot runner |

---

## License

MIT License — see [LICENSE.txt](LICENSE.txt)

---

<div align="center">

Made with Love by **Atomic Team (AZure48)**<br/>
Developed by Lendowsky, Kim7, kimsoyoun_

</div>
