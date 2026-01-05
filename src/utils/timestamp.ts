export function now(): number {
  return Math.floor(Date.now() / 1000)
}

export function from_date(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

export function to_date(unix: number): Date {
  return new Date(unix * 1000)
}

export function relative_time(unix: number): string {
  if (!unix || isNaN(unix) || unix <= 0) {
    return "Invalid Date"
  }
  return `<t:${Math.floor(unix)}:R>`
}

export function full_date_time(unix: number): string {
  if (!unix || isNaN(unix) || unix <= 0) {
    return "Invalid Date"
  }
  return `<t:${Math.floor(unix)}:F>`
}

export function short_date_time(unix: number): string {
  if (!unix || isNaN(unix) || unix <= 0) {
    return "Invalid Date"
  }
  return `<t:${Math.floor(unix)}:f>`
}

export function long_date(unix: number): string {
  if (!unix || isNaN(unix) || unix <= 0) {
    return "Invalid Date"
  }
  return `<t:${Math.floor(unix)}:D>`
}

export function short_date(unix: number): string {
  if (!unix || isNaN(unix) || unix <= 0) {
    return "Invalid Date"
  }
  return `<t:${Math.floor(unix)}:d>`
}

export function long_time(unix: number): string {
  if (!unix || isNaN(unix) || unix <= 0) {
    return "Invalid Date"
  }
  return `<t:${Math.floor(unix)}:T>`
}

export function short_time(unix: number): string {
  if (!unix || isNaN(unix) || unix <= 0) {
    return "Invalid Date"
  }
  return `<t:${Math.floor(unix)}:t>`
}

export function add_seconds(unix: number, seconds: number): number {
  return unix + seconds
}

export function add_minutes(unix: number, minutes: number): number {
  return unix + minutes * 60
}

export function add_hours(unix: number, hours: number): number {
  return unix + hours * 3600
}

export function add_days(unix: number, days: number): number {
  return unix + days * 86400
}

export function add_weeks(unix: number, weeks: number): number {
  return unix + weeks * 604800
}

export function diff_seconds(start: number, end: number): number {
  return Math.abs(end - start)
}

export function diff_minutes(start: number, end: number): number {
  return Math.floor(diff_seconds(start, end) / 60)
}

export function diff_hours(start: number, end: number): number {
  return Math.floor(diff_seconds(start, end) / 3600)
}

export function diff_days(start: number, end: number): number {
  return Math.floor(diff_seconds(start, end) / 86400)
}

export function is_past(unix: number): boolean {
  return unix < now()
}

export function is_future(unix: number): boolean {
  return unix > now()
}

export function start_of_day(unix: number): number {
  const date = to_date(unix)
  date.setHours(0, 0, 0, 0)
  return from_date(date)
}

export function end_of_day(unix: number): number {
  const date = to_date(unix)
  date.setHours(23, 59, 59, 999)
  return from_date(date)
}

export function format_iso(unix: number): string {
  return to_date(unix).toISOString()
}

export function parse_iso(iso: string): number {
  return from_date(new Date(iso))
}

export function snowflake_to_timestamp(snowflake: string): number {
  const discord_epoch = 1420070400000
  return Math.floor((Number(BigInt(snowflake) >> 22n) + discord_epoch) / 1000)
}

export function snowflake_date(snowflake: string): string {
  return full_date_time(snowflake_to_timestamp(snowflake))
}
