'use client';

import { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Page() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2 border-b pb-6">
          <h1 className="text-5xl font-bold tracking-tight">Hi !</h1>
          <p className="text-muted-foreground text-lg">
            Welcome to Atomic Bot Dashboard
          </p>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="h-2 w-2 rounded-full bg-foreground animate-pulse" />
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium">Online</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="h-2 w-2 rounded-full bg-foreground" />
            <span className="text-muted-foreground">Environment:</span>
            <span className="font-mono text-sm">{process.env.NODE_ENV || 'development'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="h-2 w-2 rounded-full bg-foreground" />
            <span className="text-muted-foreground">Timestamp:</span>
            <span className="font-mono text-sm">{new Date().toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-3 mt-8">
          <h2 className="text-xl font-semibold mb-4">System Information</h2>
          
          <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger>Server Details</AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 text-balance">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Node Version:</span>
                    <span className="font-mono">{process.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform:</span>
                    <span className="font-mono">{process.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Architecture:</span>
                    <span className="font-mono">{process.arch}</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>Runtime Statistics</AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 text-balance">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Build Time:</span>
                    <span className="font-mono">{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Framework:</span>
                    <span className="font-mono">Next.js</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-mono">1.0.0</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>Atomic Guard © 2026</p>
        </div>
      </div>
    </div>
  );
}