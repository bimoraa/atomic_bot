// - Unix timestamp conversion and formatting utilities - \\

/**
 * @returns {number} Current Unix timestamp in seconds
 */
export function now(): number {
  return Math.floor(Date.now() / 1000)
}

/**
 * @param {Date} date - JavaScript Date object
 * @returns {number} Unix timestamp in seconds
 */
export function from_date(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

/**
 * @param {number} unix - Unix timestamp in seconds
 * @returns {Date} JavaScript Date object
 */
export function to_date(unix: number): Date {
  return new Date(unix * 1000)
}

/**
 * @param {number | string | null | undefined} unix - Unix timestamp
 * @returns {string} Discord relative time format or "Not set"
 */
export function relative_time(unix: number | string | null | undefined): string {
  if (!unix) return "Not set"
  const timestamp = typeof unix === 'string' ? parseInt(unix) : unix
  if (isNaN(timestamp) || timestamp <= 0) return "Not set"
  return `<t:${Math.floor(timestamp)}:R>`
}

/**
 * @param {number | string | null | undefined} unix - Unix timestamp
 * @returns {string} Discord full date time format or "Not set"
 */
export function full_date_time(unix: number | string | null | undefined): string {
  if (!unix) return "Not set"
  const timestamp = typeof unix === 'string' ? parseInt(unix) : unix
  if (isNaN(timestamp) || timestamp <= 0) return "Not set"
  return `<t:${Math.floor(timestamp)}:F>`
}

/**
 * @param {number | string | null | undefined} unix - Unix timestamp
 * @returns {string} Discord short date time format or "Not set"
 */
export function short_date_time(unix: number | string | null | undefined): string {
  if (!unix) return "Not set"
  const timestamp = typeof unix === 'string' ? parseInt(unix) : unix
  if (isNaN(timestamp) || timestamp <= 0) return "Not set"
  return `<t:${Math.floor(timestamp)}:f>`
}

/**
 * @param {number | string | null | undefined} unix - Unix timestamp
 * @returns {string} Discord long date format or "Not set"
 */
export function long_date(unix: number | string | null | undefined): string {
  if (!unix) return "Not set"
  const timestamp = typeof unix === 'string' ? parseInt(unix) : unix
  if (isNaN(timestamp) || timestamp <= 0) return "Not set"
  return `<t:${Math.floor(timestamp)}:D>`
}

/**
 * @param {number | string | null | undefined} unix - Unix timestamp
 * @returns {string} Discord short date format or "Not set"
 */
export function short_date(unix: number | string | null | undefined): string {
  if (!unix) return "Not set"
  const timestamp = typeof unix === 'string' ? parseInt(unix) : unix
  if (isNaN(timestamp) || timestamp <= 0) return "Not set"
  return `<t:${Math.floor(timestamp)}:d>`
}

/**
 * @param {number | string | null | undefined} unix - Unix timestamp
 * @returns {string} Discord long time format or "Not set"
 */
export function long_time(unix: number | string | null | undefined): string {
  if (!unix) return "Not set"
  const timestamp = typeof unix === 'string' ? parseInt(unix) : unix
  if (isNaN(timestamp) || timestamp <= 0) return "Not set"
  return `<t:${Math.floor(timestamp)}:T>`
}

/**
 * @param {number | string | null | undefined} unix - Unix timestamp
 * @returns {string} Discord short time format or "Not set"
 */
export function short_time(unix: number | string | null | undefined): string {
  if (!unix) return "Not set"
  const timestamp = typeof unix === 'string' ? parseInt(unix) : unix
  if (isNaN(timestamp) || timestamp <= 0) return "Not set"
  return `<t:${Math.floor(timestamp)}:t>`
}

/**
 * @param {number} unix - Unix timestamp
 * @param {number} seconds - Seconds to add
 * @returns {number} New Unix timestamp
 */
export function add_seconds(unix: number, seconds: number): number {
  return unix + seconds
}

/**
 * @param {number} unix - Unix timestamp
 * @param {number} minutes - Minutes to add
 * @returns {number} New Unix timestamp
 */
export function add_minutes(unix: number, minutes: number): number {
  return unix + minutes * 60
}

/**
 * @param {number} unix - Unix timestamp
 * @param {number} hours - Hours to add
 * @returns {number} New Unix timestamp
 */
export function add_hours(unix: number, hours: number): number {
  return unix + hours * 3600
}

/**
 * @param {number} unix - Unix timestamp
 * @param {number} days - Days to add
 * @returns {number} New Unix timestamp
 */
export function add_days(unix: number, days: number): number {
  return unix + days * 86400
}

/**
 * @param {number} unix - Unix timestamp
 * @param {number} weeks - Weeks to add
 * @returns {number} New Unix timestamp
 */
export function add_weeks(unix: number, weeks: number): number {
  return unix + weeks * 604800
}

/**
 * @param {number} start - Start Unix timestamp
 * @param {number} end - End Unix timestamp
 * @returns {number} Difference in seconds
 */
export function diff_seconds(start: number, end: number): number {
  return Math.abs(end - start)
}

/**
 * @param {number} start - Start Unix timestamp
 * @param {number} end - End Unix timestamp
 * @returns {number} Difference in minutes
 */
export function diff_minutes(start: number, end: number): number {
  return Math.floor(diff_seconds(start, end) / 60)
}

/**
 * @param {number} start - Start Unix timestamp
 * @param {number} end - End Unix timestamp
 * @returns {number} Difference in hours
 */
export function diff_hours(start: number, end: number): number {
  return Math.floor(diff_seconds(start, end) / 3600)
}

/**
 * @param {number} start - Start Unix timestamp
 * @param {number} end - End Unix timestamp
 * @returns {number} Difference in days
 */
export function diff_days(start: number, end: number): number {
  return Math.floor(diff_seconds(start, end) / 86400)
}

/**
 * @param {number} unix - Unix timestamp
 * @returns {boolean} True if timestamp is in the past
 */
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
