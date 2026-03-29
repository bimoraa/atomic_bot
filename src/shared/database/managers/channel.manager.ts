/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { GuildChannel, CategoryChannel } from "discord.js"
import { logger } from "../../utils"

const log = logger.create_logger("channel_manager")

export async function move_channel_to_category(
  channel:  GuildChannel,
  category: CategoryChannel
): Promise<void> {
  await channel.setParent(category.id, { lockPermissions: true })
  log.info(`Moved ${channel.name} to ${category.name}`)
}

export async function set_channel_position(
  channel:  GuildChannel,
  position: number
): Promise<void> {
  await channel.setPosition(position)
  log.info(`Set ${channel.name} position to ${position}`)
}

export async function rename_channel(
  channel: GuildChannel,
  name:    string
): Promise<void> {
  const old_name = channel.name
  await channel.setName(name)
  log.info(`Renamed ${old_name} to ${name}`)
}

export async function delete_channel(channel: GuildChannel): Promise<void> {
  const name = channel.name
  await channel.delete()
  log.info(`Deleted channel ${name}`)
}
