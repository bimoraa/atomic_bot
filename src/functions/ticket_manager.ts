import {
  TextChannel,
  ChannelType,
  PermissionFlagsBits,
  GuildMember,
  CategoryChannel,
} from "discord.js"
import { load_config } from "../configuration/loader"
import { component, api, time, logger } from "../utils"

interface ticket_config {
  ticket_category_id: string
  log_channel_id:     string
  priority_role_id:   string
}

interface ticket_options {
  issue_type:  string
  issue_label: string
}

const config             = load_config<ticket_config>("ticket")
const ticket_category_id = config.ticket_category_id
const log_channel_id     = config.log_channel_id
const priority_role_id   = config.priority_role_id
const log                = logger.create_logger("ticket_manager")

export async function create_ticket(
  member:  GuildMember,
  options: ticket_options
): Promise<TextChannel | null> {
  const guild    = member.guild
  const category = guild.channels.cache.get(ticket_category_id) as CategoryChannel

  if (!category) {
    log.error("Ticket category not found")
    return null
  }

  const ticket_name = `ticket-${member.user.username}-${Date.now().toString(36)}`

  const ticket_channel = await guild.channels.create({
    name:   ticket_name,
    type:   ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      {
        id:   guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id:    member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ],
  })

  log.info(`Created ticket ${ticket_name} for ${member.user.tag}`)
  return ticket_channel
}

export async function send_ticket_log(
  ticket_channel: TextChannel,
  member:         GuildMember,
  issue_type:     string
): Promise<void> {
  const log_channel = member.guild.channels.cache.get(log_channel_id) as TextChannel

  if (!log_channel) {
    log.error("Log channel not found")
    return
  }

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## Ticket Opened`,
            `- **User:** ${member.user.tag} (${member.id})`,
            `- **Issue:** ${issue_type}`,
            `- **Channel:** <#${ticket_channel.id}>`,
            `- **Time:** ${time.full_date_time(time.now())}`,
          ]),
        ],
      }),
    ],
  })

  await api.send_components_v2(log_channel.id, api.get_token(), message)
  log.info(`Sent ticket log for ${member.user.tag}`)
}

export function has_priority_role(member: GuildMember): boolean {
  return member.roles.cache.has(priority_role_id)
}

export async function close_ticket(
  channel:   TextChannel,
  closed_by: GuildMember,
  reason:    string
): Promise<void> {
  log.info(`Closing ticket ${channel.name} by ${closed_by.user.tag}: ${reason}`)
  await channel.delete()
}

export async function add_user_to_ticket(
  channel: TextChannel,
  member:  GuildMember
): Promise<void> {
  await channel.permissionOverwrites.create(member, {
    ViewChannel:       true,
    SendMessages:      true,
    ReadMessageHistory: true,
  })

  log.info(`Added ${member.user.tag} to ${channel.name}`)
}

export async function remove_user_from_ticket(
  channel: TextChannel,
  member:  GuildMember
): Promise<void> {
  await channel.permissionOverwrites.delete(member)
  log.info(`Removed ${member.user.tag} from ${channel.name}`)
}
