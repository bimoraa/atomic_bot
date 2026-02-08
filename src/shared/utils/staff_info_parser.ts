import * as fs from "fs/promises"
import * as path from "path"

interface parsed_frontmatter {
  metadata: Record<string, string>
  content: string
}

export interface staff_info_metadata {
  title: string
  button_title?: string
  section: string
  updated_by?: string[]
  last_update?: number
}

export interface staff_info_document {
  metadata: staff_info_metadata
  content: string
  file_name: string
  language: string
}

function parse_frontmatter(markdown_content: string): parsed_frontmatter {
  const frontmatter_regex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = markdown_content.match(frontmatter_regex)

  if (!match) {
    return {
      metadata: {},
      content: markdown_content,
    }
  }

  const frontmatter_text = match[1]
  const content = match[2]
  const metadata: Record<string, string> = {}

  frontmatter_text.split("\n").forEach((line) => {
    const [key, ...value_parts] = line.split(":")

    if (key && value_parts.length > 0) {
      const value = value_parts.join(":").trim()
      metadata[key.trim()] = value
    }
  })

  return { metadata, content }
}

function markdown_to_discord(markdown: string): string {
  return markdown
    .replace(/^### /gm, "### ")
    .replace(/^## /gm, "## ")
    .replace(/^# /gm, "# ")
    .replace(/---/g, "")
    .trim()
}

export async function get_staff_info_document(file_name: string, language = "id"): Promise<staff_info_document | null> {
  try {
    const base_path = path.join(process.cwd(), "staff-information", language)
    const file_path = path.join(base_path, `${file_name}.md`)
    const content = await fs.readFile(file_path, "utf-8")
    const parsed = parse_frontmatter(content)

    return {
      metadata: {
        title: parsed.metadata.title || "Untitled",
        button_title: parsed.metadata["button-title"],
        section: parsed.metadata.section || "guide",
        updated_by: parsed.metadata["updated-by"]?.split(",").map((id) => id.trim()),
        last_update: parsed.metadata["last-update"] ? parseInt(parsed.metadata["last-update"], 10) : undefined,
      },
      content: markdown_to_discord(parsed.content),
      file_name,
      language,
    }
  } catch (err) {
    console.log(`[ - GET STAFF INFO - ] Error reading ${file_name} (${language}):`, err)
    return null
  }
}

export async function get_all_staff_info_documents(language = "id"): Promise<staff_info_document[]> {
  try {
    const base_path = path.join(process.cwd(), "staff-information", language)
    const files = await fs.readdir(base_path)
    const md_files = files.filter((file) => file.endsWith(".md"))
    const documents: staff_info_document[] = []

    for (const file of md_files) {
      const file_name = file.replace(".md", "")
      const doc = await get_staff_info_document(file_name, language)
      if (doc) documents.push(doc)
    }

    return documents
  } catch (err) {
    console.log(`[ - GET ALL STAFF INFO - ] Error reading directory (${language}):`, err)
    return []
  }
}

export async function get_available_languages(): Promise<string[]> {
  try {
    const base_path = path.join(process.cwd(), "staff-information")
    const entries = await fs.readdir(base_path, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch (err) {
    console.log("[ - GET LANGUAGES - ] Error:", err)
    return ["id"]
  }
}

export function file_name_to_custom_id(file_name: string): string {
  return `staff_info_${file_name.toLowerCase().replace(/-/g, "_")}`
}

export function custom_id_to_file_name(custom_id: string): string {
  return custom_id
    .replace("staff_info_", "")
    .replace(/_/g, "-")
    .toUpperCase()
}
