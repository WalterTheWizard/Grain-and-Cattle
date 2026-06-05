import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTimeEntries, useGetCurrentStatus, useClockIn, useClockOut,
  useListEmployees,
  getListTimeEntriesQueryKey, getGetCurrentStatusQueryKey, getListEmployeesQueryKey,
} from "@workspace/api-client-react";
import { Clock, LogIn, LogOut, Timer, CalendarDays, Users, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

function formatDuration(minutes: number | null, clockIn?: string, clockOut?: string | null): string {
  if (minutes === null) {
    if (clockIn && !clockOut) {
      const elapsed = Math.round((Date.now() - new Date(clockIn).getTime()) / 60000);
      return formatMins(elapsed) + " ▶";
    }
    return "—";
  }
  return formatMins(minutes);
}

function formatMins(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function totalMinutesToday(entries: Array<{ clockIn: string; clockOut?: string | null; durationMinutes?: number | null }>): number {
  const today = new Date().toDateString();
  return entries
    .filter(e => new Date(e.clockIn).toDateString() === today)
    .reduce((sum, e) => {
      if (e.durationMinutes != null) return sum + e.durationMinutes;
      const elapsed = Math.round((Date.now() - new Date(e.clockIn).getTime()) / 60000);
      return sum + elapsed;
    }, 0);
}

function totalMinutesWeek(entries: Array<{ clockIn: string; clockOut?: string | null; durationMinutes?: number | null }>): number {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return entries
    .filter(e => new Date(e.clockIn) >= weekStart)
    .reduce((sum, e) => {
      if (e.durationMinutes != null) return sum + e.durationMinutes;
      const elapsed = Math.round((Date.now() - new Date(e.clockIn).getTime()) / 60000);
      return sum + elapsed;
    }, 0);
}

export default function TimeCardPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const isEmployee = me?.role === "employer" || me?.role === "employee";

  const { data: status, isLoading: statusLoading } = useGetCurrentStatus({
    query: { queryKey: getGetCurrentStatusQueryKey(), refetchInterval: 30_000 },
  });

  const params = {
    ...(filterEmployee && filterEmployee !== "all" ? { employeeId: parseInt(filterEmployee, 10) } : {}),
    ...(filterStart ? { startDate: filterStart } : {}),
    ...(filterEnd ? { endDate: filterEnd } : {}),
  };

  const { data: entries = [], isLoading } = useListTimeEntries(params, {
    query: { queryKey: getListTimeEntriesQueryKey(params), refetchInterval: 30_000 },
  });

  const { data: employees = [] } = useListEmployees({
    query: { queryKey: getListEmployeesQueryKey() },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCurrentStatusQueryKey() });
  }

  const clockIn = useClockIn({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Clocked in — have a great shift!" }); },
      onError: (e: unknown) => {
        const msg = (e as { data?: { error?: string } })?.data?.error ?? "Could not clock in";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  const clockOut = useClockOut({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Clocked out — good work!" }); },
      onError: (e: unknown) => {
        const msg = (e as { data?: { error?: string } })?.data?.error ?? "Could not clock out";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  const isClockedIn = status?.clockedIn ?? false;
  const todayMins = totalMinutesToday(entries);
  const weekMins = totalMinutesWeek(entries);
  const activeCount = entries.filter(e => !e.clockOut).length;

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Time Cards</h1>
          <p className="text-sm text-muted-foreground">Track employee clock-in and clock-out</p>
        </div>

        {isEmployee && (
          <div className="flex items-center gap-3">
            {!statusLoading && (
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isClockedIn ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                <span className="text-sm text-muted-foreground">
                  {isClockedIn ? "Clocked In" : "Clocked Out"}
                </span>
              </div>
            )}
            {isClockedIn ? (
              <Button
                onClick={() => clockOut.mutate({})}
                disabled={clockOut.isPending}
                variant="outline"
                className="border-orange-400 text-orange-600 hover:bg-orange-50"
                data-testid="button-clock-out"
              >
                <LogOut size={15} className="mr-2" />
                {clockOut.isPending ? "Clocking out..." : "Clock Out"}
              </Button>
            ) : (
              <Button
                onClick={() => clockIn.mutate({})}
                disabled={clockIn.isPending}
                data-testid="button-clock-in"
              >
                <LogIn size={15} className="mr-2" />
                {clockIn.isPending ? "Clocking in..." : "Clock In"}
              </Button>
            )}
          </div>
        )}
      </div>

      {isEmployee && isClockedIn && status?.entry && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                <Timer size={18} className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-800 text-sm">Currently on the clock</p>
                <p className="text-xs text-green-600">
                  Started at {formatTime(status.entry.clockIn)} · {formatDuration(null, status.entry.clockIn, null)} elapsed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-l-4 border-blue-500">
              <div>
                <p className="text-xs text-muted-foreground">Hours Today</p>
                <p className="text-2xl font-bold">{formatMins(todayMins)}</p>
              </div>
              <CalendarDays size={18} className="text-muted-foreground ml-auto" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-l-4 border-green-500">
              <div>
                <p className="text-xs text-muted-foreground">Hours This Week</p>
                <p className="text-2xl font-bold">{formatMins(weekMins)}</p>
              </div>
              <Clock size={18} className="text-muted-foreground ml-auto" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-l-4 border-orange-500">
              <div>
                <p className="text-xs text-muted-foreground">Active Shifts</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
              <Users size={18} className="text-muted-foreground ml-auto" />
            </div>
          </CardContent>
        </Card>
      </div>

      {me?.role === "owner" && employees.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter size={14} />
            Filter:
          </div>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-44 h-8 text-xs" data-testid="filter-employee">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map(e => (
                <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filterStart}
            onChange={e => setFilterStart(e.target.value)}
            className="w-36 h-8 text-xs"
            data-testid="filter-start-date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={filterEnd}
            onChange={e => setFilterEnd(e.target.value)}
            className="w-36 h-8 text-xs"
            data-testid="filter-end-date"
          />
          {(filterEmployee !== "all" || filterStart || filterEnd) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setFilterEmployee("all"); setFilterStart(""); setFilterEnd(""); }}
              data-testid="button-clear-filters"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center px-4 py-2.5 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground">
            <div className="w-32">Employee</div>
            <div className="flex-1">Clock In</div>
            <div className="flex-1">Clock Out</div>
            <div className="w-24 text-right">Duration</div>
            <div className="w-28 text-right">Notes</div>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Clock size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No time entries yet</p>
              {isEmployee && !isClockedIn && (
                <p className="text-xs mt-1">Click "Clock In" above to start your shift</p>
              )}
            </div>
          ) : (
            entries.map(e => (
              <div
                key={e.id}
                data-testid={`time-entry-${e.id}`}
                className={`flex items-center px-4 py-3 border-b border-border last:border-0 text-sm ${!e.clockOut ? "bg-green-50/60" : ""}`}
              >
                <div className="w-32 font-medium text-foreground truncate">{e.employeeName ?? "—"}</div>
                <div className="flex-1 text-muted-foreground text-xs">{formatTime(e.clockIn)}</div>
                <div className="flex-1 text-muted-foreground text-xs">
                  {e.clockOut ? formatTime(e.clockOut) : (
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Active
                    </span>
                  )}
                </div>
                <div className="w-24 text-right">
                  <span className={`text-xs font-medium ${!e.clockOut ? "text-green-600" : "text-foreground"}`}>
                    {formatDuration(e.durationMinutes ?? null, e.clockIn, e.clockOut ?? null)}
                  </span>
                </div>
                <div className="w-28 text-right text-xs text-muted-foreground truncate">
                  {e.notes || "—"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
