import { useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Beef, CheckCircle2, Baby, ClipboardList, TrendingUp,
  Sprout, Wheat, Warehouse, Tractor, FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({
  title, value, icon: Icon, borderColor, subtitle,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  borderColor: string;
  subtitle?: string;
}) {
  return (
    <Card className="overflow-hidden" data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-0">
        <div className={`flex items-start gap-4 p-5 border-l-4 ${borderColor}`}>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="rounded-full bg-muted p-2">
            <Icon size={20} className="text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function genderBadge(gender: string) {
  const map: Record<string, string> = {
    female: "bg-pink-100 text-pink-800",
    male: "bg-blue-100 text-blue-800",
    bull: "bg-orange-100 text-orange-800",
    steer: "bg-gray-100 text-gray-700",
  };
  return map[gender] ?? "bg-gray-100 text-gray-700";
}

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const stats = dashboard ?? { totalHerd: 0, activeHead: 0, calves: 0, activeTasks: 0, recentRegistrations: [] };
  const acresPlanted = dashboard?.acresPlanted ?? 0;
  const expectedYield = dashboard?.expectedYield ?? 0;
  const storedGrain = dashboard?.storedGrain ?? 0;
  const equipmentNeedingService = dashboard?.equipmentNeedingService ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your farm operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Herd" value={stats.totalHerd} icon={Beef} borderColor="border-green-500" subtitle="All registered" />
        <StatCard title="Active Head" value={stats.activeHead} icon={CheckCircle2} borderColor="border-blue-500" subtitle="Currently active" />
        <StatCard title="Calves (<1yr)" value={stats.calves} icon={Baby} borderColor="border-teal-500" subtitle="Under one year" />
        <StatCard title="Active Tasks" value={stats.activeTasks} icon={ClipboardList} borderColor="border-orange-500" subtitle={stats.activeTasks > 0 ? "Action needed" : "All clear"} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Grain Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Acres Planted" value={acresPlanted} icon={Sprout} borderColor="border-green-600" subtitle="Active plantings" />
          <StatCard title="Expected Yield" value={expectedYield} icon={Wheat} borderColor="border-amber-500" subtitle="From active crops" />
          <StatCard title="Stored Grain" value={storedGrain} icon={Warehouse} borderColor="border-emerald-500" subtitle="Across all bins" />
          <StatCard title="Needs Service" value={equipmentNeedingService} icon={Tractor} borderColor="border-red-500" subtitle={equipmentNeedingService > 0 ? "Equipment down" : "All operational"} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Recent Registrations</h2>
              <Link href="/cattle">
                <span className="text-xs text-primary cursor-pointer hover:underline">View all</span>
              </Link>
            </div>
            {stats.recentRegistrations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No cattle registered yet</p>
            ) : (
              <div className="space-y-2">
                {stats.recentRegistrations.map((c) => (
                  <Link key={c.id} href={`/cattle/${c.id}`}>
                    <div
                      data-testid={`recent-cattle-${c.id}`}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Beef size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Tag #{c.tagNumber}</p>
                          <p className="text-xs text-muted-foreground">{c.name || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${genderBadge(c.gender)}`}>
                          {c.gender}
                        </span>
                        {c.breed && <span className="text-xs text-muted-foreground">{c.breed}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold text-foreground">Quick Actions</h2>
            <Link href="/cattle">
              <Button variant="outline" className="w-full justify-start" data-testid="button-view-cattle-list">
                <Beef size={15} className="mr-2" />
                View Cattle List
              </Button>
            </Link>
            <Link href="/tasks">
              <Button variant="outline" className="w-full justify-start" data-testid="button-task-manager">
                <ClipboardList size={15} className="mr-2" />
                Task Manager
              </Button>
            </Link>
            <Link href="/fields">
              <Button variant="outline" className="w-full justify-start" data-testid="button-field-management">
                <TrendingUp size={15} className="mr-2" />
                Field Management
              </Button>
            </Link>
            <Link href="/crops">
              <Button variant="outline" className="w-full justify-start" data-testid="button-crops">
                <Sprout size={15} className="mr-2" />
                Crops
              </Button>
            </Link>
            <Link href="/inputs">
              <Button variant="outline" className="w-full justify-start" data-testid="button-inputs">
                <FlaskConical size={15} className="mr-2" />
                Inputs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
