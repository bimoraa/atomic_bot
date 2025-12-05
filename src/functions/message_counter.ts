import { TextChannel, AnyThreadChannel, Message } from "discord.js";

type FetchableChannel = TextChannel | AnyThreadChannel;

const max_messages = 1000;

interface MessageLog {
  author: string;
  content: string;
  reply_to?: { author: string; content: string };
  timestamp: Date;
}

async function fetch_messages(
  channel: FetchableChannel,
  user_id: string,
  after_date?: Date
): Promise<{ count: number; logs: MessageLog[] }> {
  let count = 0;
  const logs: MessageLog[] = [];
  let last_id: string | undefined;
  let fetched = 0;

  console.log(`[fetch] ${channel.name}`);

  while (fetched < max_messages) {
    const options: { limit: number; before?: string } = { limit: 100 };
    if (last_id) options.before = last_id;

    const messages = await channel.messages.fetch(options);
    if (messages.size === 0) break;

    for (const [, msg] of messages) {
      if (after_date && msg.createdAt < after_date) {
        console.log(`[fetch] ${channel.name} done: ${count}`);
        return { count, logs };
      }
      if (msg.author.id === user_id) {
        count++;
        const log: MessageLog = {
          author: msg.author.tag,
          content: msg.content || "[attachment/embed]",
          timestamp: msg.createdAt,
        };

        if (msg.reference?.messageId) {
          try {
            const replied = await msg.fetchReference();
            log.reply_to = {
              author: replied.author.tag,
              content: replied.content?.slice(0, 50) || "[attachment/embed]",
            };
          } catch {}
        }

        logs.push(log);
      }
    }

    fetched += messages.size;
    last_id = messages.last()?.id;
    if (messages.size < 100) break;
  }

  console.log(`[fetch] ${channel.name} done: ${count}`);
  return { count, logs };
}

export async function count_user_messages(
  channel: TextChannel,
  user_id: string,
  after_date?: Date
): Promise<{ channel_count: number; thread_count: number; logs: MessageLog[] }> {
  console.log(`[count] start`);

  const channel_result = await fetch_messages(channel, user_id, after_date);
  let all_logs = [...channel_result.logs];

  let thread_count = 0;

  try {
    const [active, archived] = await Promise.all([
      channel.threads.fetchActive(),
      channel.threads.fetchArchived({ limit: 5 }),
    ]);

    const threads = [...active.threads.values(), ...archived.threads.values()].slice(0, 5);

    const results = await Promise.all(
      threads.map((thread) => fetch_messages(thread, user_id, after_date))
    );

    for (const result of results) {
      thread_count += result.count;
      all_logs = all_logs.concat(result.logs);
    }
  } catch {}

  all_logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  console.log(`[count] done: ch=${channel_result.count} th=${thread_count}`);
  return { channel_count: channel_result.count, thread_count, logs: all_logs };
}

export function format_logs(logs: MessageLog[], limit = 50): string {
  const limited = logs.slice(0, limit);
  let output = "";
  let current_date = "";

  for (const log of limited) {
    const date_str = log.timestamp.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const time_str = log.timestamp.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (date_str !== current_date) {
      current_date = date_str;
      output += `\n[ ${date_str} ]\n`;
    }

    if (log.reply_to) {
      output += `[ ${log.author} - ${time_str} ] replied to ${log.reply_to.author}:\n`;
      output += `  > ${log.reply_to.content}\n`;
      output += `  ${log.content}\n\n`;
    } else {
      output += `[ ${log.author} - ${time_str} ] - ${log.content}\n\n`;
    }
  }

  return output.trim() || "No messages found.";
}
