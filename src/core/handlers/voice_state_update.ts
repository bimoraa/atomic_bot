import { Events, VoiceState } from "discord.js"
import { client }             from "../.."
import * as tempvoice         from "../../shared/database/tempvoice"

client.on(Events.VoiceStateUpdate, async (old_state: VoiceState, new_state: VoiceState) => {
  try {
    await tempvoice.handle_voice_state_update(old_state, new_state)
  } catch (error) {
    console.error("[tempvoice] Voice state update error:", error)
  }
})
