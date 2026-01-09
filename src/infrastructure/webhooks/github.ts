import { Client }                      from "discord.js"
import { api, component, format }      from "../../shared/utils"
import { log_error }                   from "../../shared/utils/error_logger"

const is_dev        = process.env.NODE_ENV === "development"
const discord_token = is_dev ? process.env.DEV_DISCORD_TOKEN : process.env.DISCORD_TOKEN
const channel_id    = "1455105119959126036"

interface github_commit {
  id        : string
  message   : string
  timestamp : string
  url       : string
  author    : {
    name    : string
    email   : string
    username: string
  }
  added     : string[]
  removed   : string[]
  modified  : string[]
}

interface github_push_payload {
  ref        : string
  before     : string
  after      : string
  commits    : github_commit[]
  repository : {
    name      : string
    full_name : string
    html_url  : string
  }
  pusher     : {
    name  : string
    email : string
  }
  sender     : {
    login      : string
    avatar_url : string
    html_url   : string
  }
}

function get_branch_name(ref: string): string {
  return ref.replace("refs/heads/", "")
}

function truncate_commit_message(message: string): string {
  const first_line = message.split("\n")[0]
  return first_line.length > 72 ? first_line.slice(0, 69) + "..." : first_line
}

function build_commit_notification(payload: github_push_payload) {
  const branch       = get_branch_name(payload.ref)
  const commit_count = payload.commits.length
  const repo_name    = payload.repository.name
  const repo_url     = payload.repository.html_url
  const pusher       = payload.pusher.name
  const sender       = payload.sender.login

  const commit_list = payload.commits
    .slice(0, 10)
    .map((commit) => {
      const short_id  = commit.id.slice(0, 7)
      const msg       = truncate_commit_message(commit.message)
      const author    = commit.author.username || commit.author.name
      const commit_url = commit.url

      return `- [\`${short_id}\`](${commit_url}) ${msg} - ${author}`
    })
    .join("\n")

  const more_commits = commit_count > 10 ? `\n... and ${commit_count - 10} more commits` : ""

  return component.build_message({
    components: [
      component.container({
        components: [
          component.text(`## GitHub Push Notification`),
        ],
      }),
      component.container({
        components: [
          component.text([
            `- **Repository:** [${repo_name}](${repo_url})`,
            `- **Branch:** \`${branch}\``,
            `- **Pusher:** ${pusher} (${sender})`,
            `- **Commits:** ${commit_count}`,
          ]),
        ],
      }),
      component.container({
        components: [
          component.text([
            `**Recent Commits:**`,
            commit_list + more_commits,
          ]),
        ],
      }),
    ],
  })
}

export async function handle_github_webhook(payload: any, client: Client): Promise<void> {
  try {
    if (!discord_token) {
      throw new Error("Discord token missing")
    }

    if (payload.ref && payload.commits && Array.isArray(payload.commits)) {
      const push_payload = payload as github_push_payload
      
      if (push_payload.commits.length === 0) {
        return
      }

      const message = build_commit_notification(push_payload)
      
      await api.send_components_v2(channel_id, discord_token, message)
    }
  } catch (err) {
    await log_error(client, err as Error, "GitHub Webhook", {
      payload: JSON.stringify(payload).slice(0, 500),
    }).catch(() => {})
  }
}
