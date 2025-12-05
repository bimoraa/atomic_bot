export function now(): number {
  return Math.floor(Date.now() / 1000)
}

export function relative_time(unix: number): string {
  return `<t:${unix}:R>`
}

export function full_date_time(unix: number): string {
  return `<t:${unix}:F>`
}

export function short_date_time(unix: number): string {
  return `<t:${unix}:f>`
}

export function long_date(unix: number): string {
  return `<t:${unix}:D>`
}

export function short_date(unix: number): string {
  return `<t:${unix}:d>`
}

export function long_time(unix: number): string {
  return `<t:${unix}:T>`
}

export function short_time(unix: number): string {
  return `<t:${unix}:t>`
}
