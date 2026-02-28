export interface prodete_entry {
  rank         : number
  user_id      : string
  username     : string
  msg_count    : number
  claim_count  : number
  answer_count : number
  total        : number
  percentage   : string
}

export interface prodete_report {
  slug         : string
  from_date    : string
  to_date      : string
  entries      : prodete_entry[]
  generated_by : string
  generated_at : number
}
