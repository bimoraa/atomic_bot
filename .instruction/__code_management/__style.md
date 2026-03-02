---
description: Core project rules for atomic_bot — architecture, code style, DB, components, error handling
alwaysApply: true
---

# atomic_bot Project Rules

## Architecture

Three bots share `src/shared/`. Entry points:
- `src/startup/atomic_bot.ts` — moderation, tickets, payments, reminders
- `src/startup/jkt48_bot.ts` — JKT48 notifications
- `src/startup/bypass_bot.ts` — link bypassing

Path aliases: `@shared/*`, `@atomic/*`, `@jkt48/*`, `@bypass/*`, `@startup/*`

## File / Folder Structure

- Commands: `src/atomic_bot/modules/<feature>/<command_name>.ts`
- Business logic: `src/atomic_bot/core/handlers/controllers/<feature>_controller.ts`
- DB operations: `src/shared/database/managers/<feature>_manager.ts`
- Persistent state (reminders, AFK, tickets, quarantine) **must** be stored in DB

## CRITICAL: Discord Cache Is Always Empty

`atomic_bot` uses `makeCache: () => new Collection()` — `.cache` is always empty. Always use REST.

```ts
// WRONG
guild.roles.cache.has(role_id)
// CORRECT
const guild_roles = await guild.roles.fetch()
const member      = await guild.members.fetch(user_id)
```

## Database

```ts
import { db } from "@shared/utils"
const __collection = "feature_name"   // double-underscore prefix required

await db.find_one(__collection, { user_id })
await db.find_many(__collection, {})
await db.insert_one(__collection, record)
await db.update_one(__collection, { user_id }, { $set: { ... } })
await db.delete_one(__collection, { user_id, guild_id })
```

## Component V2 (Required for ALL Messages)

Never use plain `content`, legacy embeds, or unicode emojis. Discord custom emojis only: `<:name:id>`.

```ts
import { component } from "@shared/utils"

await interaction.reply({
  ...component.build_message({
    components: [
      component.container([
        component.text(["## Title", "Body"]),
        component.divider(),
        component.action_row(
          component.primary_button("Confirm", "btn_confirm"),
          component.danger_button("Cancel",   "btn_cancel"),
        ),
      ]),
    ],
  }),
  ephemeral: true,
})
```

Every `section` with an `accessory` must include the full accessory object with all required fields.

## Error Logging

Every `catch` block must call `log_error`:

```ts
import { log_error } from "@shared/utils/error_logger"

} catch (err) {
  await log_error(client, err as Error, "Context Name", { user_id, guild_id }).catch(() => {})
}
```

## Code Style (STRICT)

- **snake_case** for all identifiers, filenames, folders — no camelCase
- Vertically align `=`, `:`, and `from` within declaration/import blocks
- `from` must be vertically aligned within the same import block
- Comments: `// - comment - \\` (one line, lowercase unless acronym/proper noun)
- JSDoc required on every exported function: `@param`, `@returns`, `@description`
- Console: `console.log("[ - TITLE - ] message")`
- Constants: `const __my_constant = "value"`
- Never use Prettier or organizeImports (breaks alignment)

## Command Interface

```ts
export const command: Command = {
  data   : new SlashCommandBuilder()...,
  execute: async (interaction) => { ... },
}
```

## Pre-completion Checklist

- [ ] `npx tsc --noEmit` — zero errors
- [ ] All messages use `component.build_message` (Component V2)
- [ ] All `catch` blocks call `log_error`
- [ ] Persistent features read/write DB
- [ ] No `.cache` access on roles/members — use `.fetch()` only
