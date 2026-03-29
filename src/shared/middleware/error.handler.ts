/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 全局错误处理中间件，所有机器人的命令执行过程中的异常、报错都会在这里被统一捕获、通过系统上报并给用户返回友好的错误提示，防止服务崩溃或静默失败 - \\
// - global error handling middleware, all exceptions and errors during command execution across all bots are uniformly caught here, reported via the system logger, and a graceful error message is returned to the user to prevent service crashes or silent failures - \\

import { log_error }                           from "@shared/utils/error_logger"
import { component }                           from "@shared/utils"
import { MiddlewareFunction, MiddlewareContext, NextFunction } from "./runner"

/**
 * @description global error handling middleware for command executions
 * @param {MiddlewareContext} ctx - context containing interaction and client
 * @param {NextFunction} next - next middleware function
 * @returns {Promise<void>}
 */
export const error_handler: MiddlewareFunction = async (ctx: MiddlewareContext, next: NextFunction): Promise<void> => {
  const { interaction, client } = ctx

  try {
    await next()
  } catch (error) {
    console.error(`[ - COMMAND ERROR - ] Command: ${interaction.commandName} Error:`, error)

    await log_error(client, error as Error, `Command: ${interaction.commandName}`, {
      user   : interaction.user.tag,
      guild  : interaction.guild?.name || "DM",
      channel: interaction.channel?.id,
    }).catch(() => {})

    const err_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text("There was an error executing this command."),
          ],
        }),
      ],
    })

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ ...err_message, ephemeral: true})
      } else {
        await interaction.reply({ ...err_message, ephemeral: true})
      }
    } catch (reply_err) {
      console.error("[ - ERROR HANDLER - ] Failed to send error message to user:", reply_err)
    }
  }
}
