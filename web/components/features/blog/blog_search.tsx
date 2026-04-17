/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cn }                                        from "@/lib/utils"

// !!! blog search — custom expand/collapse search, zero external deps, ssr-safe !!! \\

interface BlogSearchProps {
  onValueChange  : (value: string) => void
  placeholder   ?: string
  expandedWidth ?: number
}

/**
 * @description expandable search input for blog topbar — no useId, no hydration issues
 * @param {BlogSearchProps} props
 * @returns {JSX.Element}
 */
export function BlogSearch({ onValueChange, placeholder = "Search...", expandedWidth = 200 }: BlogSearchProps) {
  const [open,  set_open]  = useState(false)
  const [value, set_value] = useState("")
  const input_ref          = useRef<HTMLInputElement>(null)
  const container_ref      = useRef<HTMLDivElement>(null)

  // - focus input when opened - \\
  useEffect(() => {
    if (open) input_ref.current?.focus()
  }, [open])

  // - close on outside click - \\
  useEffect(() => {
    if (!open) return
    const on_down = (e: MouseEvent) => {
      if (!container_ref.current?.contains(e.target as Node)) collapse()
    }
    document.addEventListener("mousedown", on_down)
    return () => document.removeEventListener("mousedown", on_down)
  }, [open])

  // - close on escape key - \\
  useEffect(() => {
    if (!open) return
    const on_key = (e: KeyboardEvent) => { if (e.key === "Escape") collapse() }
    document.addEventListener("keydown", on_key)
    return () => document.removeEventListener("keydown", on_key)
  }, [open])

  const collapse = useCallback(() => {
    set_open(false)
    set_value("")
    onValueChange("")
  }, [onValueChange])

  const on_change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    set_value(e.target.value)
    onValueChange(e.target.value)
  }, [onValueChange])

  return (
    <div
      ref={container_ref}
      className={cn(
        "relative flex items-center h-8 rounded-xl transition-[width,box-shadow,background-color] duration-200 ease-out overflow-hidden shrink-0",
        open
          ? "bg-[#111116] ring-1 ring-white/[0.08]"
          : "bg-[#111116]/0 ring-1 ring-transparent",
      )}
      style={{ width: open ? expandedWidth : 32 }}
    >

      {/* - icon button — opens search or is passive when already open - */}
      <button
        type="button"
        aria-label="Search"
        onClick={() => { if (!open) set_open(true) }}
        className={cn(
          "shrink-0 flex items-center justify-center w-8 h-8 rounded-xl text-white/35 transition-colors duration-150",
          !open && "hover:text-white/65 cursor-pointer",
          open  && "cursor-default text-white/30",
        )}
      >
        <SearchIcon className="w-[14px] h-[14px]" />
      </button>

      {/* - text input - */}
      <input
        ref={input_ref}
        type="text"
        value={value}
        onChange={on_change}
        placeholder={placeholder}
        className={cn(
          "flex-1 min-w-0 bg-transparent text-[13px] text-white/75 placeholder:text-white/20 outline-none",
          "transition-opacity duration-150",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      {/* - clear button — only visible when there's a query - */}
      <div
        className={cn(
          "shrink-0 flex items-center transition-[opacity,width] duration-150 overflow-hidden",
          open && value ? "opacity-100 w-7 pr-0.5" : "opacity-0 w-0",
        )}
      >
        <button
          type="button"
          aria-label="Clear search"
          onClick={collapse}
          className="flex items-center justify-center w-full h-7 rounded-lg text-white/25 hover:text-white/55 transition-colors duration-150"
        >
          <CloseIcon className="w-[11px] h-[11px]" />
        </button>
      </div>

    </div>
  )
}

// !!! inline icons — avoids any dependency that could cause ssr mismatch !!! \\

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
