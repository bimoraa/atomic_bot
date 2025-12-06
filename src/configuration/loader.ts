import { join } from "path"
import { file } from "../utils"

export function load_config<T>(feature_name: string): T {
  const config_path = join(__dirname, `${feature_name}.cfg`)
  return file.read_json<T>(config_path)
}
