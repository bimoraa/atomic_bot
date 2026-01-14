import { Client, User }    from "discord.js"
import { component }       from "../../../shared/utils"
import { log_error }       from "../../../shared/utils/error_logger"
import * as luarmor        from "../../../infrastructure/api/luarmor"

interface whitelist_options {
  user       : User
  client     : Client
  note?      : string
  days?      : number
  executor_id: string
}

interface unwhitelist_options {
  user       : User
  client     : Client
  executor_id: string
}

interface blacklist_options {
  user       : User
  client     : Client
  executor_id: string
}

interface edit_whitelist_options {
  user       : User
  client     : Client
  note?      : string
  days?      : number
  executor_id: string
}

interface get_user_stats_options {
  user       : User
  client     : Client
  executor_id: string
}

export async function whitelist(options: whitelist_options) {
  const { user, client, note, days, executor_id } = options

  try {
    const auth_expire = days ? Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60) : undefined

    const result = await luarmor.create_key({
      discord_id : user.id,
      note       : note || undefined,
      auth_expire: auth_expire,
    })

    if (!result.success || !result.data) {
      // - BETTER ERROR MESSAGES - \\
      const error_msg = result.error || "Failed to create whitelist key"
      console.error(`[ - WHITELIST - ] Failed for ${user.id}:`, error_msg)
      
      return {
        success: false,
        error  : error_msg,
      }
    }

    const channel_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `<@${user.id}> You have been whitelisted!`,
              `You can access the script via this message --> https://discord.com/channels/1250337227582472243/1398305885029273752/1449692706208219337`,
            ]),
          ],
        }),
      ],
    })

    return {
      success: true,
      message: channel_message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Whitelist User Controller", {
      user_id    : user.id,
      executor_id,
    }).catch(() => {})

    return {
      success: false,
      error  : "Failed to whitelist user",
    }
  }
}

export async function unwhitelist(options: unwhitelist_options) {
  const { user, client, executor_id } = options

  try {
    const project_id = process.env.LUARMOR_PROJECT_ID
    if (!project_id) {
      return {
        success: false,
        error  : "Luarmor project ID not configured",
      }
    }

    const deleted = await luarmor.delete_user_from_project(project_id, user.id)

    if (!deleted) {
      console.error(`[ - UNWHITELIST - ] Failed to delete user ${user.id} from project`)
      return {
        success: false,
        error  : "Failed to unwhitelist user. User may not exist or API error occurred.",
      }
    }
    
    console.log(`[ - UNWHITELIST - ] Successfully removed ${user.id} from whitelist`)

    const channel_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`<@${user.id}> has been removed from the whitelist.`),
          ],
        }),
      ],
    })

    return {
      success: true,
      message: channel_message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Unwhitelist User Controller", {
      user_id    : user.id,
      executor_id,
    }).catch(() => {})

    return {
      success: false,
      error  : "Failed to unwhitelist user",
    }
  }
}

export async function blacklist(options: blacklist_options) {
  const { user, client, executor_id } = options

  try {
    const project_id = process.env.LUARMOR_PROJECT_ID
    if (!project_id) {
      return {
        success: false,
        error  : "Luarmor project ID not configured",
      }
    }

    const deleted = await luarmor.delete_user_from_project(project_id, user.id)

    if (!deleted) {
      console.error(`[ - BLACKLIST - ] Failed to delete user ${user.id} from project`)
      return {
        success: false,
        error  : "Failed to blacklist user. User may not exist or API error occurred.",
      }
    }
    
    console.log(`[ - BLACKLIST - ] Successfully blacklisted ${user.id}`)

    const channel_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`<@${user.id}> has been blacklisted and removed from the whitelist.`),
          ],
        }),
      ],
    })

    return {
      success: true,
      message: channel_message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Blacklist User Controller", {
      user_id    : user.id,
      executor_id,
    }).catch(() => {})

    return {
      success: false,
      error  : "Failed to blacklist user",
    }
  }
}

export async function edit_whitelist(options: edit_whitelist_options) {
  const { user, client, note, days, executor_id } = options

  try {
    const project_id = process.env.LUARMOR_PROJECT_ID
    if (!project_id) {
      return {
        success: false,
        error  : "Luarmor project ID not configured",
      }
    }

    const user_data = await luarmor.get_user_by_discord(user.id)

    if (!user_data.success || !user_data.data) {
      const error_msg = user_data.is_error 
        ? (user_data.error || "API error occurred")
        : "User not found in whitelist"
      console.error(`[ - EDIT WHITELIST - ] User ${user.id} not found:`, error_msg)
      return {
        success: false,
        error  : error_msg,
      }
    }

    // - DELETE OLD KEY - \\
    const deleted = await luarmor.delete_user_from_project(project_id, user.id)
    if (!deleted) {
      console.warn(`[ - EDIT WHITELIST - ] Failed to delete old key for ${user.id}, continuing...`)
    }

    const auth_expire = days ? Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60) : undefined

    const result = await luarmor.create_key({
      discord_id : user.id,
      note       : note || undefined,
      auth_expire: auth_expire,
    })

    if (!result.success || !result.data) {
      console.error(`[ - EDIT WHITELIST - ] Failed to create new key for ${user.id}:`, result.error)
      return {
        success: false,
        error  : result.error || "Failed to update whitelist",
      }
    }
    
    console.log(`[ - EDIT WHITELIST - ] Successfully updated whitelist for ${user.id}`)

    const expire_text = auth_expire 
      ? `Expires: <t:${auth_expire}:F> (<t:${auth_expire}:R>)`
      : "Permanent"

    const channel_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `<@${user.id}> whitelist has been updated`,
              expire_text,
              note ? `Note: ${note}` : "",
            ].filter(Boolean)),
          ],
        }),
      ],
    })

    return {
      success: true,
      message: channel_message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Edit Whitelist Controller", {
      user_id    : user.id,
      executor_id,
    }).catch(() => {})

    return {
      success: false,
      error  : "Failed to edit whitelist",
    }
  }
}

export async function get_user_stats(options: get_user_stats_options) {
  const { user, client, executor_id } = options

  try {
    const user_data = await luarmor.get_user_by_discord(user.id)

    if (!user_data.success || !user_data.data) {
      const error_msg = user_data.is_error 
        ? (user_data.error || "API error occurred")
        : "User not found in whitelist"
      console.log(`[ - GET STATS - ] Failed for ${user.id}:`, error_msg)
      return {
        success: false,
        error  : error_msg,
      }
    }

    const data        = user_data.data
    const expire_text = data.auth_expire 
      ? `<t:${data.auth_expire}:F> (<t:${data.auth_expire}:R>)`
      : "Permanent"

    const channel_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## Whitelist Stats for ${user.tag}`,
            ]),
          ],
        }),
        component.container({
          components: [
            component.text([
              `User Key: \`${data.user_key}\``,
              `Status: ${data.status}`,
              `Expiration: ${expire_text}`,
            ]),
            component.divider(2),
            component.text([
              `Total Executions: ${data.total_executions}`,
              `Total Resets: ${data.total_resets}`,
              `Last Execution: ${data.last_execution || "Never"}`,
            ]),
            component.divider(2),
            component.text([
              `Note: ${data.note || "None"}`,
              `Created: <t:${Math.floor(new Date(data.created_at).getTime() / 1000)}:F>`,
            ]),
          ],
        }),
      ],
    })

    return {
      success: true,
      message: channel_message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Get User Stats Controller", {
      user_id    : user.id,
      executor_id,
    }).catch(() => {})

    return {
      success: false,
      error  : "Failed to get user stats",
    }
  }
}
