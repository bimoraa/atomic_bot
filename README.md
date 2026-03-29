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

## Architecture

```mermaid
flowchart TB
    IDX["src/index.ts\nMulti-bot Launcher"]

    IDX --> A_ENTRY["startup/atomic_bot.ts"]
    IDX --> J_ENTRY["startup/jkt48_bot.ts"]
    IDX --> B_ENTRY["startup/bypass_bot.ts"]

    subgraph ATOMIC["Atomic Bot — Server Management"]
        A_ENTRY --> A_CORE["discord/\nhandlers · router · events"]
        A_CORE  --> A_MOD["features/commands/\ncommerce · media · moderation\nserver-management · server-util · staff-management"]
        A_CORE  --> A_INFRA["integrations/\napi · cache · webhooks"]
    end

    subgraph JKT48_BOT["JKT48 Bot — Live Notifications"]
        J_ENTRY --> J_SCHED["scheduler — every 60 s\nidn_live_monitor"]
        J_SCHED --> J_CTRL["controllers\nidn_live · jkt48_live"]
        J_CTRL  --> J_API["infrastructure/api\nidn_live · showroom_live"]
        J_CTRL  --> J_MOD["modules\nnotify · history_live · check_on_live"]
    end

    subgraph BYPASS_BOT["Bypass Bot — Link Bypass"]
        B_ENTRY --> B_EV["core/events\nmessageCreate"]
        B_EV    --> B_LIM["core/limits\nrate_limit · dm_cooldown"]
        B_LIM   --> B_SVC["bypass_service"]
        B_ENTRY --> B_MOD["modules\nbypass · bypass_channel_set · bypass_support"]
    end

    ATOMIC     --> SHARED
    JKT48_BOT  --> SHARED
    BYPASS_BOT --> SHARED

    subgraph SHARED["src/shared/ — Cross-bot Layer"]
        direction LR
        SH_DB["database/\nmanagers · services · unified_ticket\ntrackers · settings"]
        SH_UTIL["utils/\ncomponent · api · modal\nlogger · discord_api · error_logger"]
        SH_CONST["constants · enums\nmodels · types · config"]
    end

    SH_DB   --> PG[("PostgreSQL")]
    SH_UTIL --> DISC(["Discord REST API"])

    subgraph WEB["web/ — Next.js 15 Dashboard"]
        direction LR
        W_APP["app/ routes\ndashboard · staff · transcript"]
        W_API["app/api/ REST endpoints"]
    end

    WEB --> PG
```

---

## Interaction Routing

```mermaid
flowchart LR
    GW(["Discord Gateway\nWebSocket"])

    GW --> IC["interactionCreate"]
    GW --> VSU["voiceStateUpdate"]
    GW --> MSG["messageCreate"]
    GW --> RDY["ready"]

    IC --> ITYPE{"Interaction\ntype"}

    ITYPE -->|"ChatInputCommand"| SLASH["features/commands/.../*.commands.ts\nexecute()"]
    ITYPE -->|"ButtonInteraction"| BTN["features/commands/.../buttons/"]
    ITYPE -->|"ModalSubmit"| MDL["features/commands/.../modals/"]
    ITYPE -->|"SelectMenu"| SEL["features/commands/.../select-menus/"]
    ITYPE -->|"Autocomplete"| AUTO["command.autocomplete()"]

    VSU --> TV["tempvoice\nhandle_voice_state_update"]
    VSU --> SV["staff_voice_controller\non_voice_join · on_voice_leave"]

    MSG --> AB["bypass_bot\nauto_bypass handler"]

    RDY --> STARTUP["load slash commands\nreconcile tempvoice guild\nrestart reminder timers"]

    SLASH & BTN & MDL & SEL --> CV2["component.build_message\nComponent V2 · flags: 32768"]
    CV2 --> REPLY(["interaction.reply\neditReply · followUp"])
```

---

## Ticket System Lifecycle

```mermaid
flowchart TD
    CLICK["User clicks\nTicket Panel button"]
    CLICK --> DEFER["interaction.deferReply ephemeral"]
    DEFER --> CHK{"Existing open\nticket?"}

    CHK -->|"Yes — thread still active"| ALREADY["Reply: already open\n+ Jump to Ticket button"]
    CHK -->|"No"| FETCH_CH["fetch ticket_parent_id channel"]

    FETCH_CH --> TH_CREATE["threads.create\nPrivateThread"]
    TH_CREATE -->|"Success"| TH_OK["Thread created"]
    TH_CREATE -->|"Error 160006\nthread limit"| ARCHIVE["archive_oldest_threads 50\nthen retry create"]
    ARCHIVE   -->|"Retry OK"| TH_OK
    ARCHIVE   -->|"Retry fails"| ERR_LIMIT["Reply: thread limit reached"]

    TH_OK --> ADD_USER["thread.members.add user"]
    ADD_USER --> SAVE["set_user_open_ticket\nsave_ticket to state + DB"]
    SAVE --> POST_PANEL["Post ticket info panel inside thread\ntype · issue · action buttons"]
    POST_PANEL --> OPEN_ST["OPEN"]

    OPEN_ST -->|"Staff clicks Claim"| MUTEX{"Per-thread mutex\n__claiming_threads"}
    MUTEX   -->|"Already claiming"| BUSY["Reply: claim in progress"]
    MUTEX   -->|"Lock acquired"| CLAIM["claim.ts\ndeferReply · verify staff role\nassign · update state · log"]
    CLAIM   --> CLAIMED_ST["CLAIMED"]

    CLAIMED_ST -->|"Add Member"| ADD_MEM["add_member.ts\nthread.members.add target"]
    CLAIMED_ST -->|"Close"| CLOSE_ACT["close.ts\nParallel:\n• generate transcript → DB\n• post close summary\n• notify owner via DM\nthread.setLocked + setArchived\nremove_user_open_ticket · delete_ticket_db"]
    CLOSE_ACT --> CLOSED_ST["CLOSED"]

    CLOSED_ST -->|"Staff reopens"| REOPEN["reopen.ts\nthread.setArchived false\nthread.setLocked false\nload_ticket · post reopen notice"]
    REOPEN --> OPEN_ST
```

---

## TempVoice Channel Lifecycle

```mermaid
flowchart TD
    JOIN["User joins\ngenerator channel"]
    JOIN --> VSU_H["handle_voice_state_update"]

    VSU_H --> IS_GEN{"channelId ==\ngeneratorChannelId?"}

    IS_GEN -->|"No — joined temp channel"| T_ADD["Add member to\nchannel thread"]
    IS_GEN -->|"No — left temp channel"| T_REM["Remove member from\nchannel thread"]
    IS_GEN -->|"Yes"| HAS_CH{"User already\nhas a channel?"}

    HAS_CH -->|"Yes"| MOVE_EX["member.voice.setChannel\nexisting channel"]
    HAS_CH -->|"No"| CREATE["guild.channels.create\nVoiceChannel + permission overwrites\nowner: ManageChannels · MoveMembers\n       MuteMembers · DeafenMembers"]

    CREATE --> REG["Register in-memory maps\n__temp_channels  __channel_owners\n__trusted_users  __blocked_users\n__waiting_rooms = false"]

    REG --> MOVE_NOW["member.voice.setChannel\nUSER MOVED IMMEDIATELY"]

    MOVE_NOW --> BGIIFE(["Background IIFE\nfire-and-forget"])

    subgraph BG["Background Tasks — non-blocking"]
        direction TB
        BG1["voice_tracker.track_channel_created\nDB insert"]
        BG2["restore_channel_settings\nname · user limit · privacy\nper-user permission overwrites"]
        BG3["create_thread\nprivate chat thread\n+ in-voice interface panel"]
        BG1 --> BG2 --> BG3
    end

    BGIIFE --> BG

    LEAVE["User leaves\ntemp channel"] --> CLR_T["Clear existing\ndeletion timer"]
    CLR_T --> DELAY["setTimeout 2 000 ms\nrace-condition guard"]
    DELAY --> EMPTY{"Active member\ncount = 0?"}
    EMPTY -->|"No"| KEEP["Keep channel alive"]
    EMPTY -->|"Yes"| DEL_CH["delete_temp_channel\nArchive + lock thread\nCleanup in-memory maps\ntrack_channel_deleted DB"]
```

---

## JKT48 Live Notification Loop

```mermaid
flowchart TD
    BOOT["Bot ready\nstart_idn_live_scheduler"]
    BOOT --> TICK["setInterval 60 000 ms"]

    TICK --> F_IDN["idn_live.get_live_rooms\nIDN Mobile API + Detail API\nwith retry on 5xx / timeout"]
    TICK --> F_SR["showroom_live.get_jkt48_showroom_lives\nShowroom API"]

    F_IDN --> MERGE["Merge IDN + Showroom\nlive room lists"]
    F_SR  --> MERGE

    MERGE --> DIFF["Diff against\nidn_live_state DB"]

    DIFF --> IS_NEW{"New live\ndetected?"}
    DIFF --> IS_END{"Live ended\nor gone?"}
    DIFF --> IS_ON{"Ongoing —\nno change?"}

    IS_NEW -->|"Yes"| UPSERT["Upsert to\nidn_live_state DB"]
    UPSERT --> GET_G["Fetch guild notification settings\njkt48_guild_notification_settings"]
    GET_G --> SEND["For each configured channel\nSend Component V2 notification\nmember · title · thumbnail · URL"]
    SEND --> SAVE_IDS["Save message IDs\nidn_live_notifications DB"]
    SAVE_IDS --> TICK

    IS_END -->|"Yes"| FETCH_IDS["Fetch saved\nmessage IDs from DB"]
    FETCH_IDS --> EDIT_MSG["Edit each notification\nmark ended · add duration"]
    EDIT_MSG --> DEL_ST["Delete live state\nfrom DB"]
    DEL_ST --> TICK

    IS_ON -->|"Yes"| TICK
    IS_NEW -->|"No"| TICK
    IS_END -->|"No"| TICK
```

---

## Bypass Bot — Link Processing Pipeline

```mermaid
flowchart LR
    MSG_EV["messageCreate"]

    MSG_EV --> PARTIAL{"partial\nmessage?"}
    PARTIAL -->|"Yes"| FETCH_P["message.fetch()"]
    PARTIAL -->|"No"| CHAN_CHK
    FETCH_P --> CHAN_CHK

    CHAN_CHK{"DM or\nconfigured\nbypass channel?"}
    CHAN_CHK -->|"Neither"| IGN["skip"]
    CHAN_CHK -->|"bypass_enabled = false"| MAINT["Reply: Under Maintenance\n+ disabled reason"]
    CHAN_CHK -->|"Is DM"| DM_COOL{"DM cooldown\nactive?"}
    CHAN_CHK -->|"Is Channel"| G_RATE{"Guild rate\nlimit hit?"}

    DM_COOL -->|"Yes — silent drop"| DROP["skip\navoid bot quarantine"]
    DM_COOL -->|"No"| EXTR
    G_RATE  -->|"Yes"| RATE_R["Reply: rate limit\n+ wait seconds"]
    G_RATE  -->|"No"| EXTR

    EXTR["extract_url_from_message\ncontent → embed.url\n→ embed.description → embed.fields"]
    EXTR --> URL_CHK{"URL\nfound?"}
    URL_CHK -->|"No"| IGN2["skip"]
    URL_CHK -->|"Yes"| PROC_R["Reply: Bypassing Link\n+ DM install button"]

    PROC_R --> TRACK["track_bypass_session\nDB upsert — restart recovery"]
    TRACK  --> BP_CALL["bypass_service.bypass_link\nwith retry callback"]

    BP_CALL -->|"Success"| OK_R["Edit reply:\nbypassed URL + Copy buttons"]
    BP_CALL -->|"Failed"| FAIL_R["Edit reply:\nerror + retry suggestion"]

    OK_R   --> CLRDB["clear_bypass_session\nDB delete"]
    FAIL_R --> CLRDB

    subgraph RECOVER["On Bot Restart"]
        direction LR
        RCV1["Query bypass_cache\nfor stuck sessions"]
        RCV2["Fetch each stuck message\nEdit: Bot Restarted notice"]
        RCV3["Delete session\nfrom bypass_cache"]
        RCV1 --> RCV2 --> RCV3
    end
```

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
│   ├── discord/
│   ├── http/
│   ├── integrations/
│   │   ├── api/
│   │   ├── cache/
│   │   └── webhooks/
│   └── features/commands/
│       ├── commerce/         # middleman, tickets, scripts, whitelister
│       ├── media/            # music
│       ├── moderation/       # moderation + quarantine
│       ├── server-management/# setup, tempvoice, staff-info, server
│       ├── server-util/      # utility, guide, reminder, ask
│       ├── staff-management/ # staff, loa, work, stats
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
