// - 处理脚本兑换 Key modal 的提交 - \
// - handles the script redeem key modal submission - \
import { ModalSubmitInteraction } from "discord.js"
import { ModalHandler }           from "@shared/types/interaction"
import { component }              from "@shared/utils"
import * as luarmor               from "@atomic/infrastructure/api/luarmor"

export const modal: ModalHandler = {
  custom_id: "script_redeem_key_modal",
  async execute(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: 64 })

    const user_key = interaction.fields.getTextInputValue("user_key").trim()

    if (!user_key) {
      await interaction.editReply({ content: "Invalid key. Please try again." })
      return
    }

    const result = await luarmor.link_discord(user_key, interaction.user.id)

    const message = component.build_message({
      components: [
        component.container({
          accent_color: result.success ? 0x57F287 : 0xED4245,
          components: [
            component.text(
              result.success
                ? "## Key Redeemed!\nYour script key has been linked to your Discord account. Use **Get Script** to retrieve your loader."
                : `## Redemption Failed\n${result.error || "Invalid key or already linked. Please contact staff."}`
            ),
          ],
        }),
      ],
    })

    await interaction.editReply(message)
  },
}
