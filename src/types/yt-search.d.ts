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
