import { GuildChannel, CategoryChannel } from "discord.js";

export async function move_channel_to_category(
  channel: GuildChannel,
  category: CategoryChannel
): Promise<void> {
  await channel.setParent(category.id, { lockPermissions: true });
}
