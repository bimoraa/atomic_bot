/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { join } from "path"
import { file } from "../utils"

export function load_config<T>(feature_name: string): T {
  const config_path = join(__dirname, `${feature_name}.cfg`)
  return file.read_json<T>(config_path)
}
