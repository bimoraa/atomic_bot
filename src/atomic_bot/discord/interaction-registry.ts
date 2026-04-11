/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 交互模块注册表，动态加载 buttons/modals/select-menus 文件夹 - \\
// - interaction module registry, dynamically loads buttons/modals/select-menus folders - \\
import { Dirent, existsSync, readdirSync } from "fs"
import { join }                            from "path"

type interaction_module = Record<string, any>
type interaction_kind = "buttons" | "modals" | "select-menus"

function walk_files(dir_path: string): string[] {
  const items = readdirSync(dir_path, { withFileTypes: true })

  return items.flatMap((item: Dirent) => {
    const item_path = join(dir_path, item.name)

    if (item.isDirectory()) {
      return walk_files(item_path)
    }

    if (item.isFile() && (item.name.endsWith(".ts") || item.name.endsWith(".js"))) {
      return [item_path]
    }

    return []
  })
}

function load_interaction_registry(kind: interaction_kind): Map<string, interaction_module> {
  const commands_root    = join(__dirname, "../features/commands")
  const registry         = new Map<string, interaction_module>()
  const feature_aliases  = new Set<string>()

  const feature_dirs = readdirSync(commands_root, { withFileTypes: true })
    .filter((group) => group.isDirectory())
    .flatMap((group) => {
      const group_path = join(commands_root, group.name)

      return readdirSync(group_path, { withFileTypes: true })
        .filter((feature) => feature.isDirectory())
        .map((feature) => ({
          group_name      : group.name,
          feature_name    : feature.name,
          interaction_path: join(group_path, feature.name, kind),
        }))
    })

  for (const feature of feature_dirs) {
    if (!existsSync(feature.interaction_path)) {
      continue
    }

    const files = walk_files(feature.interaction_path)
    if (files.length === 0) {
      continue
    }

    const merged_module: interaction_module = {}

    for (const file_path of files) {
      const loaded_module = require(file_path)
      Object.assign(merged_module, loaded_module.default ?? {}, loaded_module)
    }

    registry.set(`${feature.group_name}/${feature.feature_name}`, merged_module)

    if (!feature_aliases.has(feature.feature_name)) {
      registry.set(feature.feature_name, merged_module)
      feature_aliases.add(feature.feature_name)
    } else {
      console.warn(
        `[ - INTERACTION REGISTRY - ] Duplicate feature alias "${feature.feature_name}" for ${kind}, use group/feature key if needed.`,
      )
    }
  }

  return registry
}

function get_module<T extends interaction_module>(
  registry: Map<string, interaction_module>,
  kind: interaction_kind,
  key: string,
): T {
  const module = registry.get(key)

  if (!module) {
    throw new Error(`[ - INTERACTION REGISTRY - ] Missing ${kind} module: ${key}`)
  }

  return module as T
}

const button_registry      = load_interaction_registry("buttons")
const modal_registry       = load_interaction_registry("modals")
const select_menu_registry = load_interaction_registry("select-menus")

export function get_button_module<T extends interaction_module>(key: string): T {
  return get_module<T>(button_registry, "buttons", key)
}

export function get_modal_module<T extends interaction_module>(key: string): T {
  return get_module<T>(modal_registry, "modals", key)
}

export function get_select_menu_module<T extends interaction_module>(key: string): T {
  return get_module<T>(select_menu_registry, "select-menus", key)
}
