/**
 * - MULTI-BOT LAUNCHER - \\
 * Main entry point that starts all bots
 */

// - DISABLE CONSOLE.LOG IN PRODUCTION - \\
const is_production = process.env.NODE_ENV === "production"
if (is_production) {
  console.log = () => {}
}

import "./startup/atomic_bot"
import "./startup/jkt48_bot"
import "./startup/bypass_bot"

console.info("[ - LAUNCHER - ] All bots started")
