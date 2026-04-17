/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Metadata }           from "next"
import { ContentCreatorFlow } from "@/components/features/flowchart/content_creator_flow"

export const metadata: Metadata = {
  title       : "Content Creator Program — Atomic",
  description : "Earn Rp 2.500 for every script purchase through your invite link. Join the Atomic Content Creator program.",
}

export default function ContentCreatorFlowchartPage() {
  return <ContentCreatorFlow />
}
