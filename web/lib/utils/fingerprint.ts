"use client"

/**
 * @description Generate a stable browser fingerprint using canvas, screen, timezone,
 *              language, and hardware concurrency. Used as a web-based HWID.
 * @returns A hex string fingerprint
 */
export async function get_device_fingerprint(): Promise<string> {
  const parts: string[] = []

  // - CANVAS FINGERPRINT - \\
  try {
    const canvas  = document.createElement("canvas")
    const ctx     = canvas.getContext("2d")
    if (ctx) {
      canvas.width  = 200
      canvas.height = 50
      ctx.textBaseline = "top"
      ctx.font         = "14px Arial"
      ctx.fillStyle    = "#f60"
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle    = "#069"
      ctx.fillText("Atomicals", 2, 15)
      ctx.fillStyle    = "rgba(102,204,0,0.7)"
      ctx.fillText("Atomicals", 4, 17)
      parts.push(canvas.toDataURL())
    }
  } catch { /* blocked — skip */ }

  // - STABLE BROWSER SIGNALS - \\
  parts.push(navigator.language       ?? "")
  parts.push(navigator.platform       ?? "")
  parts.push(String(navigator.hardwareConcurrency ?? 0))
  parts.push(String(screen.colorDepth ?? 0))
  parts.push(String(screen.width)  + "x" + String(screen.height))
  parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone ?? "")

  const raw     = parts.join("|")
  const encoded = new TextEncoder().encode(raw)
  const hash    = await crypto.subtle.digest("SHA-256", encoded)
  const hex     = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")

  return hex
}
