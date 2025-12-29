import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  ChannelType,
  ForumChannel,
} from "discord.js";
import { Command } from "../../types/command";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("leave_threads")
    .setDescription("Leave all threads/posts in a channel or forum")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel or forum to leave all threads from")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildForum)
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel("channel", true) as TextChannel | ForumChannel;
    const user_id = interaction.user.id;

    await interaction.deferReply({ ephemeral: true });

    console.log(`[leave_threads] Fetching threads from ${channel.name}...`);

    const active_threads = await channel.threads.fetchActive();
    const all_threads = [...active_threads.threads.values()];

    console.log(`[leave_threads] Found ${all_threads.length} active threads`);
    await interaction.editReply({ content: `Processing ${all_threads.length} threads...` });

    let left_count = 0;

    for (const thread of all_threads) {
      try {
        const member = await thread.members.fetch(user_id).catch(() => null);
        
        if (member) {
          await thread.members.remove(user_id);
          console.log(`[leave_threads] Left: ${thread.name}`);
          left_count++;
        }
      } catch (err: any) {
        console.log(`[leave_threads] Error ${thread.name}: ${err.message}`);
      }
    }

    const type_name = channel.type === ChannelType.GuildForum ? "post(s)" : "thread(s)";
    
    console.log(`[leave_threads] Done! Left ${left_count}`);
    
    await interaction.editReply({
      content: `Left ${left_count} ${type_name} from <#${channel.id}>.`,
    });
  },
};
