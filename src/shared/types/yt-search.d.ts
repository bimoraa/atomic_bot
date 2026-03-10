/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

declare module "yt-search" {
  interface YtSearchOptions {
    query : string
    hl?   : string
    gl?   : string
  }

  interface YtSearchAuthor {
    name? : string
  }

  interface YtSearchVideo {
    title     : string
    author?   : YtSearchAuthor
    url       : string
    timestamp?: string
    thumbnail?: string
  }

  interface YtSearchResult {
    videos : YtSearchVideo[]
  }

  function search(options: YtSearchOptions): Promise<YtSearchResult>

  const yts: {
    search: typeof search
  }

  export = yts
}
