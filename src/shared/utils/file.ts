import * as fs from "fs"
import * as path from "path"

export function read(file_path: string, encoding: BufferEncoding = "utf-8"): string {
  return fs.readFileSync(file_path, encoding)
}

export function write(file_path: string, content: string): void {
  ensure_dir(path.dirname(file_path))
  fs.writeFileSync(file_path, content)
}

export function append(file_path: string, content: string): void {
  ensure_dir(path.dirname(file_path))
  fs.appendFileSync(file_path, content)
}

export function read_json<T>(file_path: string): T {
  const content = read(file_path)
  return JSON.parse(content)
}

export function write_json<T>(file_path: string, data: T, pretty: boolean = true): void {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
  write(file_path, content)
}

export function exists(file_path: string): boolean {
  return fs.existsSync(file_path)
}

export function dir_exists(dir_path: string): boolean {
  return fs.existsSync(dir_path) && fs.statSync(dir_path).isDirectory()
}

export function ensure_dir(dir_path: string): void {
  if (!fs.existsSync(dir_path)) {
    fs.mkdirSync(dir_path, { recursive: true })
  }
}

export function remove(file_path: string): boolean {
  if (fs.existsSync(file_path)) {
    fs.unlinkSync(file_path)
    return true
  }
  return false
}

export function remove_dir(dir_path: string): boolean {
  if (fs.existsSync(dir_path)) {
    fs.rmSync(dir_path, { recursive: true })
    return true
  }
  return false
}

export function copy(src: string, dest: string): void {
  ensure_dir(path.dirname(dest))
  fs.copyFileSync(src, dest)
}

export function move(src: string, dest: string): void {
  ensure_dir(path.dirname(dest))
  fs.renameSync(src, dest)
}

export function list(dir_path: string, recursive: boolean = false): string[] {
  if (!dir_exists(dir_path)) return []

  const files: string[] = []
  const entries = fs.readdirSync(dir_path, { withFileTypes: true })

  for (const entry of entries) {
    const full_path = path.join(dir_path, entry.name)
    if (entry.isFile()) {
      files.push(full_path)
    } else if (recursive && entry.isDirectory()) {
      files.push(...list(full_path, true))
    }
  }

  return files
}

export function list_dirs(dir_path: string): string[] {
  if (!dir_exists(dir_path)) return []
  const entries = fs.readdirSync(dir_path, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => path.join(dir_path, e.name))
}

export function size(file_path: string): number {
  if (!exists(file_path)) return 0
  return fs.statSync(file_path).size
}

export function modified(file_path: string): Date | null {
  if (!exists(file_path)) return null
  return fs.statSync(file_path).mtime
}

export function resolve(...paths: string[]): string {
  return path.resolve(...paths)
}

export function join(...paths: string[]): string {
  return path.join(...paths)
}

export function basename(file_path: string): string {
  return path.basename(file_path)
}

export function dirname(file_path: string): string {
  return path.dirname(file_path)
}

export function extname(file_path: string): string {
  return path.extname(file_path)
}

export function without_ext(file_path: string): string {
  const ext = path.extname(file_path)
  return file_path.slice(0, -ext.length)
}
