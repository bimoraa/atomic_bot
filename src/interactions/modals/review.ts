import { ModalSubmitInteraction, TextChannel } from "discord.js";
import { load_config } from "../../configuration/loader";

const config = load_config<{ review_channel_id: string }>("review");
const review_channel_id = config.review_channel_id;

export async function handle_review_modal(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ flags: 64 });

  const review_text = interaction.fields.getTextInputValue("review_text");
  const rating_str = interaction.fields.getTextInputValue("review_rating");

  const rating = parseInt(rating_str);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    await interaction.editReply({
      content: "Rating must be a number between 1 and 5.",
    });
    return;
  }

  const stars = "⭐".repeat(rating);
  const timestamp = Math.floor(Date.now() / 1000);

  const channel = interaction.client.channels.cache.get(review_channel_id) as TextChannel;
  if (!channel) {
    await interaction.editReply({
      content: "Review channel not found.",
    });
    return;
  }

  const user = interaction.user;
  const avatar_url = user.displayAvatarURL({ size: 128 });

  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: null,
            spoiler: false,
            components: [
              {
                type: 9,
                components: [
                  {
                    type: 10,
                    content: `## New Review from <@${user.id}>\n**Review:** ${review_text}\n**Rating:** ${stars}\n**Reviewed:** <t:${timestamp}:R>`,
                  },
                ],
                accessory: {
                  type: 11,
                  media: {
                    url: avatar_url,
                  },
                },
              },
              {
                type: 14,
              },
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 1,
                    label: "Submit a Review",
                    custom_id: "review_submit",
                  },
                  {
                    type: 2,
                    style: 2,
                    label: "Useful",
                    custom_id: `review_useful_${user.id}_${timestamp}`,
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.log("[review] Error:", data);
      await interaction.editReply({
        content: "Failed to submit review. Check console for details.",
      });
      return;
    }

    await interaction.editReply({
      content: "Thank you for your review!",
    });
  } catch (err) {
    console.log("[review] Error:", err);
    await interaction.editReply({
      content: "Failed to submit review.",
    });
  }
}
