import { ModalSubmitInteraction } from "discord.js";

const devlog_channel_id = "1257034070035267636";
const priority_role_id  = "1398313779380617459";
const logo_url          = "https://github.com/bimoraa/Euphoria/blob/main/aaaaa.png?raw=true";

function format_list(items: string, prefix: string): string {
  if (!items.trim()) return "";
  return items
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => `${prefix} ${line.trim()}`)
    .join("\n");
}

export async function handle(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith("devlog_modal_")) return false;

  const parts = interaction.customId.replace("devlog_modal_", "").split("_");
  const version = parts.pop()!;
  const script = parts.join("_");

  const added = interaction.fields.getTextInputValue("added");
  const improved = interaction.fields.getTextInputValue("improved");
  const removed = interaction.fields.getTextInputValue("removed");
  const fixed = interaction.fields.getTextInputValue("fixed");

  await interaction.deferReply({ ephemeral: true });

  let changelog = "## Changelogs\n";

  const added_list = format_list(added, "[ + ]");
  const improved_list = format_list(improved, "[ / ]");
  const removed_list = format_list(removed, "[ - ]");
  const fixed_list = format_list(fixed, "[ ! ]");

  if (added_list) changelog += `\n### - Added:\n${added_list}\n`;
  if (improved_list) changelog += `\n### - Improved:\n${improved_list}\n`;
  if (removed_list) changelog += `\n### - Removed:\n${removed_list}\n`;
  if (fixed_list) changelog += `\n### - Fixed:\n${fixed_list}\n`;

  if (!added_list && !improved_list && !removed_list && !fixed_list) {
    changelog += "\nNo changes specified.";
  }

  const response = await fetch(`https://discord.com/api/v10/channels/${devlog_channel_id}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    },
    body: JSON.stringify({
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 9,
              components: [
                {
                  type: 10,
                  content: `## Atomicals Script Update Logs\n- **${script}**\n- **Version:** v${version}\n- **Developer Notes:**\n> Found any bugs or issues? Feel free to report them to the developers! 💙\n> Got ideas or suggestions for new scripts? We'd love to hear them! 🚀`,
                },
              ],
              accessory: {
                type: 11,
                media: {
                  url: logo_url,
                },
              },
            },
            {
              type: 14,
              divider: true,
            },
            {
              type: 10,
              content: changelog,
            },
            {
              type: 14,
            },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 5,
                  label: "Report Bugs",
                  url: "https://discord.com/channels/1250337227582472243/1320078429110145114",
                },
                {
                  type: 2,
                  style: 5,
                  label: "Suggest a Feature",
                  url: "https://discord.com/channels/1250337227582472243/1351980309557542962",
                },
              ],
            },
          ],
        },
        {
          type: 10,
          content: `<@&${priority_role_id}>`,
        },
      ],
    }),
  });

  if (response.ok) {
    await interaction.editReply({ content: `Developer log sent for **${script}** v${version}!` });
  } else {
    const error = await response.json();
    console.error("[devlog] Error:", error);
    await interaction.editReply({ content: "Failed to send developer log." });
  }

  return true;
}
