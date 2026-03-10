/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 控制器的统一导出入口 - \
// - barrel export for all controllers - \
export * from "./ask_controller"
export * from "./devlog_controller"
export * from "./loa_controller"
export * from "./middleman_controller"
export * from "./moderation_controller"
export * from "./quarantine_controller"
export * from "./reminder_controller"
export * from "./review_controller"
export * from "./ticket_controller"
export * from "./setup_controller"

export * as service_provider from "./service_provider_controller"
export * as whitelister       from "./whitelister_controller"
