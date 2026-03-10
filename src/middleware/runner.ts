/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { ChatInputCommandInteraction, Client } from "discord.js"

export interface MiddlewareContext {
  interaction: ChatInputCommandInteraction
  client     : Client
}

export type NextFunction       = () => Promise<void>
export type MiddlewareFunction = (ctx: MiddlewareContext, next: NextFunction) => Promise<void>

/**
 * @description Runs a series of middlewares before executing the final handler
 * @param {MiddlewareFunction[]} middlewares - Array of middleware functions
 * @param {MiddlewareContext} ctx - Context object containing interaction and client
 * @param {NextFunction} final_handler - Final function to execute if all middlewares pass
 * @returns {Promise<void>}
 */
export async function run_middleware(
  middlewares  : MiddlewareFunction[],
  ctx          : MiddlewareContext,
  final_handler: NextFunction
): Promise<void> {
  let index = -1

  const dispatch = async (i: number): Promise<void> => {
    if (i <= index) {
      throw new Error("next() called multiple times")
    }
    index = i

    if (i === middlewares.length) {
      await final_handler()
      return
    }

    const middleware = middlewares[i]
    if (middleware) {
      await middleware(ctx, () => dispatch(i + 1))
    }
  }

  await dispatch(0)
}
