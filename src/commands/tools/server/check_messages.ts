import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
  AttachmentBuilder,
  GuildMember,
} from "discord.js";
import { Command } from "../../../types/command";
import { count_user_messages, format_logs } from "../../../services/message_counter";
import { is_admin } from "../../../services/permissions";

const duration_map: Record<string, number> = {
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

async function send_components_v2(
  interaction: ChatInputCommandInteraction,
  components: object[],
  file_content: string
) {
  const form_data = new FormData();

  form_data.append(
    "payload_json",
    JSON.stringify({
      flags: 32768,
      components,
      attachments: [{ id: 0, filename: "message_log.txt" }],
    })
  );

  const blob = new Blob([file_content], { type: "text/plain" });
  form_data.append("files[0]", blob, "message_log.txt");

  const url = `https://discord.com/api/v10/webhooks/${interaction.client.user?.id}/${interaction.token}/messages/@original`;

  await fetch(url, {
    method: "PATCH",
    body: form_data,
  });
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("check_messages")
    .setDescription("Check message count of a user in a channel")
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to check").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Time range to check")
        .setRequired(true)
        .addChoices(
          { name: "1 Day", value: "1d" },
          { name: "7 Days", value: "7d" },
          { name: "Lifetime", value: "lifetime" },
          { name: "Custom", value: "custom" }
        )
    )
    .addChannelOption((option) =>
      option.setName("channel").setDescription("The channel to check (default: current)").setRequired(false)
    )
    .addIntegerOption((option) =>
      option.setName("custom_days").setDescription("Custom duration in days (only if custom selected)").setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;

    if (!is_admin(member)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      });
      return;
    }

    const user = interaction.options.getUser("user", true);
    const channel = (interaction.options.getChannel("channel") || interaction.channel) as TextChannel;
    const duration = interaction.options.getString("duration", true);
    const custom_days = interaction.options.getInteger("custom_days");

    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ content: "Invalid text channel.", ephemeral: true });
      return;
    }

    if (duration === "custom" && !custom_days) {
      await interaction.reply({ content: "Please provide custom_days when using custom duration.", ephemeral: true });
      return;
    }

    const start_time = Date.now();
    await interaction.deferReply({ ephemeral: true });

    let after_date: Date | undefined;
    let duration_text = "lifetime";

    if (duration === "custom" && custom_days) {
      after_date = new Date(Date.now() - custom_days * 24 * 60 * 60 * 1000);
      duration_text = `${custom_days} days`;
    } else if (duration !== "lifetime") {
      after_date = new Date(Date.now() - duration_map[duration]);
      duration_text = duration === "1d" ? "1 day" : "7 days";
    }

    try {
      const { channel_count, thread_count, logs } = await count_user_messages(channel, user.id, after_date);
      const total = channel_count + thread_count;
      const taken_time = ((Date.now() - start_time) / 1000).toFixed(1);
      const log_content = format_logs(logs);

      await send_components_v2(
        interaction,
        [
          {
            type: 17,
            components: [
              {
                type: 9,
                components: [
                  {
                    type: 10,
                    content: `## ${user.tag} result in <#${channel.id}>\n- Channel: **${channel_count}**\n- Threads: **${thread_count}**\n- Total: **${total}**\n- Duration: **${duration_text}**`,
                  },
                ],
                accessory: {
                  type: 11,
                  media: {
                    url: user.displayAvatarURL(),
                  },
                },
              },
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 2,
                    label: `Taken time: ${taken_time}s`,
                    disabled: true,
                    custom_id: "taken_time",
                  },
                ],
              },
              {
                type: 13,
                file: {
                  url: "attachment://message_log.txt",
                },
              },
            ],
          },
        ],
        log_content
      );
    } catch (err) {
      console.error("[check_messages] Error:", err);
      await interaction.editReply({ content: "Failed to fetch messages. Check bot permissions." });
    }
  },
};
