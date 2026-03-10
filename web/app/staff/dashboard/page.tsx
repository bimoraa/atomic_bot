/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, CalendarDays, LucideIcon, ClipboardList } from "lucide-react";
import SalesOverviewChart from "@/components/shadcn-space/blocks/dashboard-shell-01/sales-overview-chart";
import TopProductTable from "@/components/shadcn-space/blocks/dashboard-shell-01/top-product-table";
import { cn } from "@/lib/utils";
import { get_dashboard_stats, get_recent_work_logs, get_chart_data } from "@/lib/db";
import Link from 'next/link';

type DashboardMetric = {
  label: string;
  value: string;
  percentage: string;
  isPositive?: boolean;
};

type MainDashboardData = {
  title: string;
  description: string;
  metrics: DashboardMetric[];
};

type StatItem = {
  title: string;
  value: string;
  percentage: string;
  icon: LucideIcon;
  isPositive?: boolean;
  href?: string;
};

type StatisticsBlockProps = {
  mainDashboard: MainDashboardData;
  secondaryStats: StatItem[];
};

const StatisticsBlock = ({
  mainDashboard,
  secondaryStats,
}: StatisticsBlockProps) => {
  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      <div className="col-span-12 xl:col-span-6 h-full">
        <Card className="p-0 ring-0 border border-border/40 rounded-2xl relative h-full bg-zinc-950/40">
          <CardContent className="p-0">
            <div className="ps-6 py-6 flex flex-col gap-9 justify-between min-h-[180px]">
              <div>
                <p className="text-lg font-medium text-white">
                  {mainDashboard.title}
                </p>
                <p className="text-xs font-normal text-zinc-400">
                  {mainDashboard.description}
                </p>
              </div>
              <div className="flex items-center gap-6">
                {mainDashboard.metrics.map((metric, index) => (
                  <div key={index} className="flex items-center gap-6 z-10">
                    <div>
                      <p className="text-xs font-normal text-zinc-400 mb-1">
                        {metric.label}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold tracking-tight text-white">
                          {metric.value}
                        </p>
                        <Badge
                          className={cn(
                            "font-normal border-0 text-xs px-1.5 py-0 rounded-full",
                            metric.isPositive
                              ? "bg-teal-500/10 text-teal-400"
                              : "bg-red-500/10 text-red-500 text-opacity-80"
                          )}
                        >
                          {metric.percentage}
                        </Badge>
                      </div>
                    </div>
                    {index < mainDashboard.metrics.length - 1 && (
                      <Separator
                        orientation="vertical"
                        className={"h-12 bg-border/40"}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* image */}
            <img
              src="https://images.shadcnspace.com/assets/backgrounds/stats-01.webp"
              alt="user-img"
              width={211}
              height={168}
              className="absolute bottom-0 right-0 hidden sm:block rounded-br-2xl"
            />
          </CardContent>
        </Card>
      </div>
      {secondaryStats.map((stat, index) => (
        <div
          key={index}
          className="col-span-12 sm:col-span-6 xl:col-span-3 min-h-[180px]"
        >
          <Card className="p-6 ring-0 border border-border/40 rounded-2xl h-full bg-zinc-950/40">
            <CardContent className="p-0 flex items-start justify-between h-full">
              <div className="flex flex-col gap-6 justify-between h-full">
                <div className="flex flex-col gap-1.5">
                  <p className="text-base font-medium text-white">
                    {stat.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold tracking-tight text-white">
                      {stat.value}
                    </p>
                    <Badge
                      className={cn(
                        "font-normal border-0 text-xs px-1.5 py-0 rounded-full",
                        stat.isPositive !== false
                          ? "bg-teal-500/10 text-teal-400"
                          : "bg-red-500/10 text-red-400"
                      )}
                    >
                      {stat.percentage}
                    </Badge>
                  </div>
                </div>
                {/* button */}
                <Button
                  variant={"outline"}
                  className={"flex items-center gap-2 w-fit rounded-full bg-zinc-900/40 border-border/40 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors h-9 px-4"}
                  asChild
                >
                  <Link href={stat.href ?? "#"}>
                    <span className="text-xs font-medium">See Report</span>
                    <ArrowRight size={14} className="text-zinc-500" />
                  </Link>
                </Button>
              </div>
              <div className="p-3 rounded-full outline outline-1 outline-border/40 bg-zinc-900/40 mt-1">
                <stat.icon size={18} className="text-zinc-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
};

export const revalidate = 0;

export default async function DashboardOverview() {
  const stats     = await get_dashboard_stats();
  const work_logs = await get_recent_work_logs(8);
  const chart_data = await get_chart_data();

  const mainDashboardData = {
    title: "Overview Analytics",
    description: "Realtime statistics fetched from database operations.",
    metrics: [
      {
        label: "Weekly Revenue",
        value: `Rp ${new Intl.NumberFormat("id-ID").format(stats.total_earnings)}`,
        percentage: "+10%",
        isPositive: true,
      },
      {
        label: "Staff Salaries",
        value: `Rp ${new Intl.NumberFormat("id-ID").format(stats.total_salaries)}`,
        percentage: "-2%",
        isPositive: false,
      },
    ],
  };

  const secondaryStatsData: StatItem[] = [
    {
      title: "Transcripts",
      value: stats.total_transcripts.toString(),
      percentage: "+5%",
      icon: CalendarDays,
      isPositive: true,
      href: "/staff/dashboard/transcripts",
    },
    {
      title: "Total Work Logs",
      value: stats.total_work_logs.toString(),
      percentage: "+12%",
      icon: ClipboardList,
      isPositive: true,
      href: "/staff/dashboard/activity",
    },
  ];

  return (
    <div className="w-full flex-1 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Overview</h2>
        <p className="text-muted-foreground text-sm">
          Realtime revenue, salaries, and metrics across the platform.
        </p>
      </div>

      <StatisticsBlock mainDashboard={mainDashboardData} secondaryStats={secondaryStatsData} />
      
      <div className="grid grid-cols-12 gap-6 pt-2 items-start">
        <div className="xl:col-span-8 col-span-12">
            <SalesOverviewChart chartData={chart_data} totalActivities={stats.total_work_logs} />
        </div>
        <div className="xl:col-span-4 col-span-12">
            <TopProductTable work_logs={work_logs} />
        </div>
      </div>
    </div>
  );
}