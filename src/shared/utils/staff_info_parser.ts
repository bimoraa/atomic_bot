import * as fs   from "fs/promises"
import * as path from "path"

export interface staff_info_metadata {
  title: string
  button_title?: string
  section: "rules" | "guide"
  updated_by?: string[]
  last_update?: number
}

export interface staff_info_document {
  metadata: staff_info_metadata
  content: string
  file_name: string
  language: string
}

/**
 * - PARSE FRONTMATTER FROM MARKDOWN - \\
 * 
 * @param {string} markdown_content - Raw markdown content
 * @returns {object} Parsed metadata and content
 */
function parse_frontmatter(markdown_content: string): { metadata: Record<string, any>; content: string } {
  const frontmatter_regex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match             = markdown_content.match(frontmatter_regex)

  if (!match) {
    return {
      metadata: {},
      content : markdown_content,
    }
  }

  const frontmatter_text = match[1]
  const content          = match[2]
  const metadata: Record<string, any> = {}

  frontmatter_text.split("\n").forEach((line) => {
    const [key, ...value_parts] = line.split(":")
    if (key && value_parts.length > 0) {
      const value = value_parts.join(":").trim()
      metadata[key.trim()] = value
    }
  })

  return { metadata, content }
}

/**
 * - CONVERT MARKDOWN CONTENT TO DISCORD TEXT - \\
 * 
 * @param {string} markdown - Markdown content
 * @returns {string} Discord-formatted text
 */
function markdown_to_discord(markdown: string): string {
  return markdown
    .replace(/^### /gm, "### ")
    .replace(/^## /gm, "## ")
    .replace(/^# /gm, "# ")
    .trim()
}

/**
 * - GET STAFF INFO DOCUMENT - \\
 * 
 * @param {string} file_name - File name (e.g., "COMMUNICATION-RULES")
 * @param {string} language - Language code (e.g., "id", "en")
 * @returns {Promise<staff_info_document | null>} Parsed document or null
 */
export async function get_staff_info_document(
  file_name: string,
  language: string = "id"
): Promise<staff_info_document | null> {
  try {
    const base_path = path.join(process.cwd(), "staff-information", language)
    const file_path = path.join(base_path, `${file_name}.md`)

    const content = await fs.readFile(file_path, "utf-8")
    const parsed  = parse_frontmatter(content)

    return {
      metadata: {
        title       : parsed.metadata.title || "Untitled",
        button_title: parsed.metadata["button-title"],
        section     : parsed.metadata.section || "guide",
        updated_by  : parsed.metadata["updated-by"]?.split(",").map((id: string) => id.trim()),
        last_update : parsed.metadata["last-update"] ? parseInt(parsed.metadata["last-update"]) : undefined,
      },
      content  : markdown_to_discord(parsed.content),
      file_name: file_name,
      language : language,
    }
  } catch (err) {
    console.log(`[ - GET STAFF INFO - ] Error reading ${file_name} (${language}):`, err)
    return null
  }
}

/**
 * - GET ALL STAFF INFO DOCUMENTS - \\
 * 
 * @param {string} language - Language code
 * @returns {Promise<staff_info_document[]>} Array of documents
 */
export async function get_all_staff_info_documents(language: string = "id"): Promise<staff_info_document[]> {
  try {
    const base_path = path.join(process.cwd(), "staff-information", language)
    const files     = await fs.readdir(base_path)
    const md_files  = files.filter((f) => f.endsWith(".md"))

    const documents: staff_info_document[] = []

    for (const file of md_files) {
      const file_name = file.replace(".md", "")
      const doc       = await get_staff_info_document(file_name, language)
      if (doc) {
        documents.push(doc)
      }
    }

    return documents
  } catch (err) {
    console.log(`[ - GET ALL STAFF INFO - ] Error reading directory (${language}):`, err)
    return []
  }
}

/**
 * - GET AVAILABLE LANGUAGES - \\
 * 
 * @returns {Promise<string[]>} Array of language codes
 */
export async function get_available_languages(): Promise<string[]> {
  try {
    const base_path = path.join(process.cwd(), "staff-information")
    const entries   = await fs.readdir(base_path, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch (err) {
    console.log("[ - GET LANGUAGES - ] Error:", err)
    return ["id"]
  }
}

/**
 * - MAP FILE NAME TO CUSTOM ID - \\
 * 
 * @param {string} file_name - File name
 * @returns {string} Custom ID for button
 */
export function file_name_to_custom_id(file_name: string): string {
  return `staff_info_${file_name.toLowerCase().replace(/-/g, "_")}`
}

/**
 * - MAP CUSTOM ID TO FILE NAME - \\
 * 
 * @param {string} custom_id - Button custom ID
 * @returns {string} File name
 */
export function custom_id_to_file_name(custom_id: string): string {
  return custom_id
    .replace("staff_info_", "")
    .replace(/_/g, "-")
    .toUpperCase()
}
