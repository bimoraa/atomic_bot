/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - anti-nuke database manager: whitelist, config, incidents, snapshots - \\
import { db }                    from "@utils"
import {
  anti_nuke_whitelist_record,
  anti_nuke_channel_snapshot,
  anti_nuke_role_snapshot,
  anti_nuke_incident,
  anti_nuke_config_record,
}                                from "@models/anti_nuke.model"

const __collection_whitelist        = "anti_nuke_whitelist"
const __collection_incidents        = "anti_nuke_incidents"
const __collection_snap_channel     = "anti_nuke_snap_channel"
const __collection_snap_role        = "anti_nuke_snap_role"
const __collection_config           = "anti_nuke_config"

// - default config values used when no record exists for a guild - \\
const __default_config: Omit<anti_nuke_config_record, "_id" | "guild_id"> = {
  enabled             : true,
  log_channel_id      : null,
  staff_role_id       : null,
  maintenance_mode    : false,
  maintenance_until   : 0,
  soft_alert_threshold: 45,
  quarantine_threshold: 70,
}

// ─── whitelist ─────────────────────────────────────────────────────────────────

/**
 * @description get all whitelisted users for a guild
 * @param guild_id - Discord guild ID
 * @returns Promise with array of whitelist records
 */
export async function get_whitelist(guild_id: string): Promise<anti_nuke_whitelist_record[]> {
  return db.find_many<anti_nuke_whitelist_record>(__collection_whitelist, { guild_id })
}

/**
 * @description check if a user is whitelisted from anti-nuke detection
 * @param user_id  - Discord user ID
 * @param guild_id - Discord guild ID
 * @returns Promise<boolean>
 */
export async function is_whitelisted(user_id: string, guild_id: string): Promise<boolean> {
  const record = await db.find_one<anti_nuke_whitelist_record>(__collection_whitelist, { user_id, guild_id })
  return record !== null
}

/**
 * @description add a user to the anti-nuke whitelist
 * @param user_id  - Discord user ID to whitelist
 * @param guild_id - Discord guild ID
 * @param added_by - Discord user ID of the staff who added them
 * @returns Promise<void>
 */
export async function add_whitelist(user_id: string, guild_id: string, added_by: string): Promise<void> {
  const exists = await is_whitelisted(user_id, guild_id)
  if (exists) return

  await db.insert_one<anti_nuke_whitelist_record>(__collection_whitelist, {
    user_id,
    guild_id,
    added_by,
    added_at: Math.floor(Date.now() / 1000),
  })
}

/**
 * @description remove a user from the anti-nuke whitelist
 * @param user_id  - Discord user ID
 * @param guild_id - Discord guild ID
 * @returns Promise<boolean> true if removed, false if not found
 */
export async function remove_whitelist(user_id: string, guild_id: string): Promise<boolean> {
  return db.delete_one(__collection_whitelist, { user_id, guild_id })
}

// ─── config ────────────────────────────────────────────────────────────────────

/**
 * @description get anti-nuke config for a guild, returning defaults if not found
 * @param guild_id - Discord guild ID
 * @returns Promise with the guild's anti-nuke config
 */
export async function get_config(guild_id: string): Promise<anti_nuke_config_record> {
  const record = await db.find_one<anti_nuke_config_record>(__collection_config, { guild_id })
  if (record) return record

  return { guild_id, ...__default_config }
}

/**
 * @description update (upsert) anti-nuke config for a guild
 * @param guild_id - Discord guild ID
 * @param updates  - partial config fields to update
 * @returns Promise<void>
 */
export async function update_config(
  guild_id: string,
  updates : Partial<Omit<anti_nuke_config_record, "_id" | "guild_id">>
): Promise<void> {
  await db.update_one<anti_nuke_config_record>(__collection_config, { guild_id }, updates, true)
}

/**
 * @description enable or disable maintenance mode for a guild
 * @param guild_id - Discord guild ID
 * @param enabled  - true to enable, false to disable
 * @param minutes  - how many minutes maintenance mode should last (only used when enabled=true)
 * @returns Promise<void>
 */
export async function set_maintenance(guild_id: string, enabled: boolean, minutes = 60): Promise<void> {
  const maintenance_until = enabled
    ? Math.floor(Date.now() / 1000) + minutes * 60
    : 0

  await update_config(guild_id, {
    maintenance_mode : enabled,
    maintenance_until,
  })
}

/**
 * @description check if maintenance mode is currently active for a guild
 * @param guild_id - Discord guild ID
 * @returns Promise<boolean>
 */
export async function is_maintenance_active(guild_id: string): Promise<boolean> {
  const config = await get_config(guild_id)

  if (!config.maintenance_mode) return false

  const now = Math.floor(Date.now() / 1000)
  if (config.maintenance_until > 0 && now > config.maintenance_until) {
    // - auto-expire maintenance mode when the timer runs out - \\
    await update_config(guild_id, { maintenance_mode: false, maintenance_until: 0 })
    return false
  }

  return true
}

// ─── incidents ─────────────────────────────────────────────────────────────────

/**
 * @description save an anti-nuke incident to the database
 * @param incident - incident record to save
 * @returns Promise<void>
 */
export async function save_incident(incident: anti_nuke_incident): Promise<void> {
  await db.insert_one<anti_nuke_incident>(__collection_incidents, incident)
}

/**
 * @description get an anti-nuke incident by its ID
 * @param incident_id - unique incident ID
 * @param guild_id    - Discord guild ID
 * @returns Promise with incident or null
 */
export async function get_incident(incident_id: string, guild_id: string): Promise<anti_nuke_incident | null> {
  return db.find_one<anti_nuke_incident>(__collection_incidents, { incident_id, guild_id })
}

/**
 * @description get recent anti-nuke incidents for a guild ordered by newest first
 * @param guild_id - Discord guild ID
 * @param limit    - max number of incidents to return
 * @returns Promise with array of incidents
 */
export async function get_recent_incidents(guild_id: string, limit = 10): Promise<anti_nuke_incident[]> {
  const all = await db.find_many<anti_nuke_incident>(__collection_incidents, { guild_id })

  return all
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}

/**
 * @description mark an incident as manually reverted by staff
 * @param incident_id - unique incident ID
 * @param guild_id    - Discord guild ID
 * @param reverted_by - Discord user ID of the staff who reverted
 * @returns Promise<boolean>
 */
export async function mark_incident_reverted(
  incident_id : string,
  guild_id    : string,
  reverted_by : string
): Promise<boolean> {
  return db.update_one<anti_nuke_incident>(
    __collection_incidents,
    { incident_id, guild_id },
    {
      reverted    : true,
      reverted_by,
      reverted_at : Math.floor(Date.now() / 1000),
    }
  )
}

// ─── snapshots ─────────────────────────────────────────────────────────────────

/**
 * @description save a channel snapshot captured at event time
 * @param snapshot - channel snapshot to save
 * @returns Promise<void>
 */
export async function save_channel_snapshot(snapshot: anti_nuke_channel_snapshot): Promise<void> {
  await db.insert_one<anti_nuke_channel_snapshot>(__collection_snap_channel, snapshot)
}

/**
 * @description save a role snapshot captured at event time
 * @param snapshot - role snapshot to save
 * @returns Promise<void>
 */
export async function save_role_snapshot(snapshot: anti_nuke_role_snapshot): Promise<void> {
  await db.insert_one<anti_nuke_role_snapshot>(__collection_snap_role, snapshot)
}

/**
 * @description get all channel snapshots for a specific incident
 * @param incident_id - unique incident ID
 * @param guild_id    - Discord guild ID
 * @returns Promise with array of channel snapshots
 */
export async function get_channel_snapshots(incident_id: string, guild_id: string): Promise<anti_nuke_channel_snapshot[]> {
  return db.find_many<anti_nuke_channel_snapshot>(__collection_snap_channel, { incident_id, guild_id })
}

/**
 * @description get all role snapshots for a specific incident
 * @param incident_id - unique incident ID
 * @param guild_id    - Discord guild ID
 * @returns Promise with array of role snapshots
 */
export async function get_role_snapshots(incident_id: string, guild_id: string): Promise<anti_nuke_role_snapshot[]> {
  return db.find_many<anti_nuke_role_snapshot>(__collection_snap_role, { incident_id, guild_id })
}
