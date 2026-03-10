/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

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
