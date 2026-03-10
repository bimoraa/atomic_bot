/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar/app_sidebar";

export default function Page() {
  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <AppSidebar />
      </div>
    </SidebarProvider>
  );
}