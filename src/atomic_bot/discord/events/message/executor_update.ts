/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { client }                         from "@startup/atomic_bot"
import { start_executor_update_poller }   from "@commands/server-util/utility/jobs/executor_poller.job"

client.once("ready", () => {
  void start_executor_update_poller(client)
})
