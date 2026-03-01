export interface prodete_entry {
  rank              : number
  user_id           : string
  username          : string
  msg_count         : number
  claim_count       : number
  answer_count      : number
  voice_seconds     ?: number
  voice_count       ?: number
  total             : number
  percentage        : string
  channel_breakdown : Record<string, number>
  ticket_breakdown  : Record<string, number>
  answer_breakdown  : Record<string, number>
}

export interface prodete_report {
  slug          : string
  from_date     : string
  to_date       : string
  entries       : prodete_entry[]
  channel_names : Record<string, string>
  generated_by  : string
  generated_at  : number
}
