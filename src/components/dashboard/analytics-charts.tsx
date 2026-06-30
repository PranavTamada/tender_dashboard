"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { StatsResponse } from "@/types/tender";

const PRIMARY = "#3b82f6";
const VIOLET = "#8b5cf6";

export function AnalyticsCharts({
  stats,
  isLoading,
}: {
  stats: StatsResponse | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const trendData = stats.dailyTrend.map((d) => ({
    label: format(parseISO(d.date), "dd MMM"),
    count: d.count,
  }));
  const weeklyData = stats.weeklyTrend.map((d) => ({
    label: format(parseISO(d.week), "dd MMM"),
    count: d.count,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Matches by Sector</CardTitle>
        </CardHeader>
        <CardContent>
          <HBars data={stats.bySector.slice(0, 7)} color={PRIMARY} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top Matched Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <HBars data={stats.byKeyword.slice(0, 7)} color={VIOLET} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Collection Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily">
            <TabsList className="mb-2 h-8">
              <TabsTrigger value="daily" className="h-6 text-xs">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="h-6 text-xs">Weekly</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="mt-0">
              <TrendArea data={trendData} />
            </TabsContent>
            <TabsContent value="weekly" className="mt-0">
              <TrendArea data={weeklyData} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function HBars({
  data,
  color,
}: {
  data: { key: string; count: number }[];
  color: string;
}) {
  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No data yet
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="key"
          width={130}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "transparent" }} />
        <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TrendArea({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 4 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.4} />
            <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="count" stroke={PRIMARY} strokeWidth={2} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};
