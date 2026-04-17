/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - server-side blog post reader — parses MD files from content/blog/ - \\

import fs   from "fs"
import path from "path"

// !!! types !!! \\

export interface BlogPostMeta {
  uuid       : string
  title      : string
  description: string
  date       : string
  readTime   : string
  category   : string
  tag        : string
  author     : string
  avatar     : string
}

export interface BlogPost {
  meta    : BlogPostMeta
  content : string
}

// !!! constants !!! \\

const __blog_dir = path.join(process.cwd(), "content/blog")

// !!! frontmatter parser !!! \\

/**
 * @description parses YAML-like frontmatter from raw markdown string
 * @param {string} raw - raw markdown file content
 * @returns {{ data: Record<string, string>; content: string }}
 */
function parse_frontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)/)
  if (!match) return { data: {}, content: raw }

  const lines = match[1].split("\n")
  const data: Record<string, string> = {}

  for (const line of lines) {
    const colon = line.indexOf(": ")
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const val = line.slice(colon + 2).trim().replace(/^["']|["']$/g, "")
    data[key] = val
  }

  return { data, content: match[2] }
}

// !!! public api !!! \\

/**
 * @description reads and parses a blog post from its UUID
 * @param {string} uuid - the blog post UUID matching the frontmatter uuid field
 * @returns {Promise<BlogPost | null>}
 */
export async function get_blog_post(uuid: string): Promise<BlogPost | null> {
  if (!fs.existsSync(__blog_dir)) return null

  const files = fs.readdirSync(__blog_dir).filter(f => f.endsWith(".md"))

  for (const file of files) {
    const raw              = fs.readFileSync(path.join(__blog_dir, file), "utf-8")
    const { data, content} = parse_frontmatter(raw)

    if (data.uuid === uuid) {
      return {
        meta: {
          uuid       : data.uuid        ?? "",
          title      : data.title       ?? "",
          description: data.description ?? "",
          date       : data.date        ?? "",
          readTime   : data.readTime    ?? "",
          category   : data.category    ?? "",
          tag        : data.tag         ?? "",
          author     : data.author      ?? "",
          avatar     : data.avatar      ?? "",
        },
        content,
      }
    }
  }

  return null
}

/**
 * @description returns all blog post metadata for static generation
 * @returns {Promise<BlogPostMeta[]>}
 */
export async function get_all_blog_posts(): Promise<BlogPostMeta[]> {
  if (!fs.existsSync(__blog_dir)) return []

  const files = fs.readdirSync(__blog_dir).filter(f => f.endsWith(".md"))
  const posts: BlogPostMeta[] = []

  for (const file of files) {
    const raw      = fs.readFileSync(path.join(__blog_dir, file), "utf-8")
    const { data } = parse_frontmatter(raw)

    if (data.uuid) {
      posts.push({
        uuid       : data.uuid        ?? "",
        title      : data.title       ?? "",
        description: data.description ?? "",
        date       : data.date        ?? "",
        readTime   : data.readTime    ?? "",
        category   : data.category    ?? "",
        tag        : data.tag         ?? "",
        author     : data.author      ?? "",
        avatar     : data.avatar      ?? "",
      })
    }
  }

  // - sort newest first - \\
  posts.sort((a, b) => parse_blog_date(b.date) - parse_blog_date(a.date))

  return posts
}

// !!! date sort helper !!! \\

const __month_map: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

/**
 * @description parses "Mon 14 Apr 04.13" style date strings into a sortable timestamp
 * @param {string} date_str - raw date string from frontmatter
 * @returns {number} unix-like timestamp for comparison
 */
function parse_blog_date(date_str: string): number {
  // - format: "Mon 14 Apr 04.13" or "14 Apr" — extract day, month, optional time - \\
  const parts  = date_str.trim().split(/\s+/)
  let day      = 0
  let month    = -1
  let hours    = 0
  let minutes  = 0

  for (const part of parts) {
    const as_num = parseInt(part, 10)
    if (!isNaN(as_num) && as_num >= 1 && as_num <= 31 && day === 0) {
      day = as_num
    } else if (__month_map[part.toLowerCase().slice(0, 3)] !== undefined) {
      month = __month_map[part.toLowerCase().slice(0, 3)]
    } else if (/^\d{1,2}\.\d{2}$/.test(part)) {
      const [h, m] = part.split(".")
      hours   = parseInt(h, 10)
      minutes = parseInt(m, 10)
    }
  }

  if (month === -1) return 0
  return new Date(2026, month, day, hours, minutes).getTime()
}
