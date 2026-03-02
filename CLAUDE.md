````md
# Copilot Instructions — atomic_bot

## Architecture

Three independent Discord bots sharing a `src/shared/` layer, plus a Next.js dashboard at `web/`.

| Entry Point | Bot |
|---|---|
| `src/startup/atomic_bot.ts` | Main server management (moderation, tickets, payments, reminders) |
| `src/startup/jkt48_bot.ts` | JKT48 live stream notifications |
| `src/startup/bypass_bot.ts` | Automatic link bypassing |

**Path aliases** (tsconfig):  
`@shared/*` → `src/shared/*`  
`@atomic/*` → `src/atomic_bot/*`  
`@jkt48/*` → `src/jkt48_bot/*`  
`@bypass/*` → `src/bypass_bot/*`  
`@startup/*` → `src/startup/*`

---

## CRITICAL: Discord Cache is Always Empty

`atomic_bot` uses `makeCache: () => new Collection()` — **all `.cache` properties are permanently empty**.  
Always use REST fetches.

```ts
// WRONG — always returns false/empty
guild.roles.cache.has(role_id)
member.roles.cache.filter(...)

// CORRECT
const guild_roles = await guild.roles.fetch()
const member      = await guild.members.fetch(user_id)
````

---

## Dev Workflows

```bash
# Build (required before deploy — also copies config/sub_commands/guide dirs)
npm run build

# Dev watch mode per bot
npm run dev:atomic
npm run dev:jkt48
npm run dev:bypass
npm run dev:all         # all three concurrently

# Web dashboard
cd web && npm run dev
```

`console.log` is suppressed in production (`NODE_ENV !== "development"`).

---

## File / Folder Structure

* Commands: `src/atomic_bot/modules/<feature>/commands/<command_name>.ts`
* Interactions: `src/atomic_bot/modules/<feature>/interactions/<type>/<file>.ts`
* Feature business logic (shared across related commands):
  `src/atomic_bot/modules/<feature>/controller.ts`
* DB operations for a feature:
  `src/shared/database/managers/<feature>_manager.ts`
* Persistent state (reminders, AFK, tickets, quarantine) **must** be stored in DB so it survives restarts

Example:
`/reminder` + `/reminder-cancel`
→ `reminder_controller.ts`
→ `reminder_manager.ts`

---

## Database

PostgreSQL via `pg` pool. Use the `db` object from `@shared/utils`.

```ts
import { db } from "@shared/utils"

await db.find_one(__collection, { user_id })
await db.find_many(__collection, {})
await db.insert_one(__collection, record)
await db.update_one(__collection, { user_id }, { $set: { ... } })
await db.delete_one(__collection, { user_id, guild_id })
```

Module-level collection name **must** use double-underscore prefix:

```ts
const __collection = "reminders"
```

---

## Component V2 (Required for All Messages)

Every bot reply **must** use Component V2 via `@shared/utils/components`.
`flags: 32768` is set automatically by `build_message`.

```ts
import { component } from "@shared/utils"

await interaction.reply({
  ...component.build_message({
    components: [
      component.container([
        component.text(["## Title", "Body text here"]),
        component.divider(),
        component.action_row(
          component.primary_button("Confirm", "btn_confirm"),
          component.danger_button("Cancel",  "btn_cancel"),
        ),
      ]),
    ],
  }),
  ephemeral: true,
})
```

Rules:

* ❌ Never use plain `content`
* ❌ Never use legacy embeds
* ❌ No unicode emojis
* ✅ Discord custom emojis only: `<:name:id>`

**Avoid Component V2 error (`BASE_TYPE_REQUIRED`)**:
Every `section` that has an `accessory` **must** include the full accessory object with all required fields.

---

## Error Logging

Every `catch` block **must** call `log_error` from `@shared/utils/error_logger`.

```ts
import { log_error } from "@shared/utils/error_logger"

} catch (err) {
  await log_error(client, err as Error, "Descriptive Context Name", {
    user_id,
    guild_id,
  }).catch(() => {})
}
```

---

## Code Style (STRICT)

* **snake_case** for all identifiers, filenames, and folders — no camelCase
* **Align vertically** within a declaration block:

  * `=`
  * `:`
  * `from`
* **IMPORT ALIGNMENT IS STRICT**
  `from` **must be vertically aligned** within the same import block
* **Comments**:

  ```ts
  // - comment - \\
  ```

  one line, lowercase unless acronym or proper noun
* **JSDoc required** on every exported function:

  * `@param`
  * `@returns`
  * `@description`
* **Console**:

  ```ts
  console.log("[ - TITLE - ] message")
  ```
* **Constants**:

  ```ts
  const __my_constant = "value"
  ```
* Fix duplicates **manually** — never via shell scripts
* Disable auto-formatters that break alignment:

  * Prettier
  * organizeImports

---

## Command Interfaces (`src/shared/types/command.ts`)

```ts
// Slash command
export interface Command {
  data         : SlashCommandBuilder
               | SlashCommandOptionsOnlyBuilder
               | SlashCommandSubcommandsOnlyBuilder
  execute      : (interaction: ChatInputCommandInteraction) => Promise<void>
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>
}

// Message context menu (right-click → Apps)
export interface MessageContextMenuCommand {
  data   : ContextMenuCommandBuilder
  execute: (interaction: MessageContextMenuCommandInteraction) => Promise<void>
}
```

Export format **must** be:

```ts
export const command: Command = { ... }
```

---

## Web Dashboard (`web/`)

* Next.js 15 + shadcn/ui
* Dark mode only
* Use original shadcn colors
* No excessive gradients

Component folders:

* `web/components/animations/`
* `web/components/layout/`
* `web/components/features/`
* `web/components/demos/`
* `web/components/ui/`

---

## Pre-completion Checklist

* [ ] Run `npx tsc --noEmit` and confirm zero red errors
* [ ] All messages use Component V2 (`component.build_message`)
* [ ] All `catch` blocks call `log_error`
* [ ] Persistent features (reminders, AFK, quarantine, tickets) read/write DB
* [ ] No `.cache` access on roles/members — use `.fetch()` only

---

## Additional Notes
* Prioritize performance and efficiency in all code, including hosting costs and database usage
* Tolong agar kodingan lebih rapih, terorganisir, dan ikuti struktur file/folder yang sudah ada di project, dan manusiawi sebisa mungkin\
* Commit message harus pake bahasa indonesia gaul, simple, dan jelas