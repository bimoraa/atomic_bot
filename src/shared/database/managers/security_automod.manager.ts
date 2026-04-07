/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { db }                                                                            from "@utils"
import { security_automod_config_model, security_automod_word_model }                   from "@models/security_automod.model"

const __config_collection = "security_automod_config"
const __words_collection  = "security_automod_words"

/**
 * @description normalize banned word input for consistent storage and matching
 * @param {string} word - raw word input
 * @returns {string} normalized lowercase word
 */
export function normalize_security_automod_word(word: string): string {
  return word.trim().toLowerCase()
}

/**
 * @description fetch automod config for a guild
 * @param {string} guild_id - discord guild id
 * @returns {Promise<security_automod_config_model | null>} config document or null
 */
export async function get_security_automod_config(guild_id: string): Promise<security_automod_config_model | null> {
  return db.find_one<security_automod_config_model>(__config_collection, { guild_id })
}

/**
 * @description upsert automod config for a guild
 * @param {string} guild_id - discord guild id
 * @param {Partial<security_automod_config_model>} config - partial config values
 * @returns {Promise<boolean>} true when update succeeds
 */
export async function upsert_security_automod_config(
  guild_id: string,
  config  : Partial<security_automod_config_model>
): Promise<boolean> {
  return db.update_one<security_automod_config_model>(
    __config_collection,
    { guild_id },
    {
      ...config,
      updated_at : config.updated_at ?? Math.floor(Date.now() / 1000),
      updated_by : config.updated_by ?? "system",
      enabled    : config.enabled ?? false,
    },
    true,
  )
}

/**
 * @description add one banned word for a guild if not exists
 * @param {string} guild_id - discord guild id
 * @param {string} word - banned word text
 * @param {string} created_by - discord user id who added the word
 * @returns {Promise<boolean>} true when inserted, false when already exists or invalid
 */
export async function add_security_automod_word(guild_id: string, word: string, created_by: string): Promise<boolean> {
  const normalized_word = normalize_security_automod_word(word)

  if (!normalized_word) {
    return false
  }

  const existing = await db.find_one<security_automod_word_model>(__words_collection, {
    guild_id,
    word: normalized_word,
  })

  if (existing) {
    return false
  }

  await db.insert_one<security_automod_word_model>(__words_collection, {
    guild_id,
    word       : normalized_word,
    created_by,
    created_at : Math.floor(Date.now() / 1000),
  })

  return true
}

/**
 * @description remove one banned word for a guild
 * @param {string} guild_id - discord guild id
 * @param {string} word - banned word text
 * @returns {Promise<boolean>} true when deleted
 */
export async function remove_security_automod_word(guild_id: string, word: string): Promise<boolean> {
  const normalized_word = normalize_security_automod_word(word)

  if (!normalized_word) {
    return false
  }

  return db.delete_one(__words_collection, {
    guild_id,
    word: normalized_word,
  })
}

/**
 * @description list banned words configured for a guild
 * @param {string} guild_id - discord guild id
 * @returns {Promise<string[]>} sorted normalized word list
 */
export async function list_security_automod_words(guild_id: string): Promise<string[]> {
  const records = await db.find_many<security_automod_word_model>(__words_collection, { guild_id })

  return records
    .map(record => normalize_security_automod_word(record.word))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
}

/**
 * @description get default-safe config for runtime checks
 * @param {string} guild_id - discord guild id
 * @returns {Promise<security_automod_config_model>} hydrated config with defaults
 */
export async function get_security_automod_config_or_default(guild_id: string): Promise<security_automod_config_model> {
  const config = await get_security_automod_config(guild_id)

  if (config) {
    return {
      guild_id,
      enabled       : Boolean(config.enabled),
      log_channel_id: config.log_channel_id ?? null,
      updated_by    : config.updated_by || "system",
      updated_at    : config.updated_at || Math.floor(Date.now() / 1000),
    }
  }

  return {
    guild_id,
    enabled       : false,
    log_channel_id: null,
    updated_by    : "system",
    updated_at    : Math.floor(Date.now() / 1000),
  }
}
