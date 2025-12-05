import { readFileSync } from "fs";
import { join } from "path";

export function load_config<T>(feature_name: string): T {
    const config_path = join(__dirname, `${feature_name}.cfg`);
    const content = readFileSync(config_path, "utf-8");
    return JSON.parse(content) as T;
}
