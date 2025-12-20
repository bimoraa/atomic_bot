# Atomic Bot
jangan karna aku bisa ngoding
kamu kira aku bisa hack akun pesnuk


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
