import { useEffect, useState } from "react";
import {
  LayoutDashboard, FileText, CheckCircle2, Clock,
  TrendingUp, BarChart2, MapPin, GitMerge,
  Filter, Eye, ChevronDown, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { adminApi, AdminStats, ComplaintListOut } from "@/lib/api";
import { useNavigate } from "react-router-dom";

// UI Config for Status Badges
const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  registered: { label: "Registered", cls: "bg-blue-100 text-blue-700" },
  verified: { label: "Verified", cls: "bg-purple-100 text-purple-700" },
  assigned: { label: "Assigned", cls: "bg-orange-100 text-orange-700" },
  in_progress: { label: "In Progress", cls: "bg-yellow-100 text-yellow-700" },
  resolved: { label: "Resolved", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700" },
};

// UI Config for Priority Badges
const PRIORITY_CONFIG: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const BAR_COLORS = ["bg-blue-500", "bg-cyan-400", "bg-purple-400", "bg-green-400", "bg-orange-400", "bg-gray-300"];

export default function AdminDashboard() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [complaints, setComplaints] = useState<ComplaintListOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [statsData, complaintsData] = await Promise.all([
        adminApi.stats(),
        adminApi.listComplaints({ limit: 50 }) // Fetch latest 50
      ]);
      setStats(statsData);
      setComplaints(complaintsData);
    } catch (error: any) {
      console.error("Failed to fetch admin data", error);
      setFetchError(error?.message || "Failed to load dashboard data. Check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAdmin) {
        // Not an admin or not logged in -> redirect
        navigate("/signin");
        return;
      }
      // Is admin -> fetch data
      fetchData();
    }
  }, [authLoading, isAdmin, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive font-medium mb-2">Dashboard Error</p>
          <p className="text-sm text-muted-foreground mb-4">{fetchError}</p>
          <button onClick={fetchData} className="text-primary text-sm underline">Retry</button>
        </div>
      </div>
    );
  }

  // Client-side filtering for the table
  const filtered = statusFilter === "all"
    ? complaints
    : complaints.filter(c => c.status === statusFilter);

  // Stats cards configuration
  const statCards = [
    {
      label: "Total Complaints",
      value: stats?.total || 0,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      label: "Resolved",
      value: stats?.resolved || 0,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50"
    },
    {
      label: "Pending",
      value: stats?.pending || 0,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50"
    },
    {
      label: "Duplicates Caught",
      value: stats?.duplicates_caught || 0,
      icon: GitMerge,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
  ];

  // Category Distribution for chart
  const catDistribution = stats?.by_category
    ? Object.entries(stats.by_category).map(([label, count]) => ({
      label,
      count,
      pct: stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
    })).sort((a, b) => b.count - a.count)
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Admin topbar */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
            <span className="hidden sm:inline text-xs text-muted-foreground">— Grievance Management System</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500 status-pulse" />
              Live View
            </div>
            <Button variant="ghost" size="icon" onClick={fetchData} disabled={refreshing}>
              <RefreshCw size={16} className={cn(refreshing && "animate-spin")} />
            </Button>
            <div className="text-xs font-medium border border-border px-3 py-1 rounded bg-muted/50">
              {user?.full_name} ({user?.email})
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-white border border-border rounded-lg p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bg)}>
                  <stat.icon size={18} className={stat.color} />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground mb-0.5">{stat.value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Distribution */}
          <div className="bg-white border border-border rounded-lg p-5 lg:col-span-1">
            <div className="flex items-center gap-2 mb-5">
              <BarChart2 size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">By Category</h2>
            </div>
            {catDistribution.length > 0 ? (
              <div className="space-y-3">
                {catDistribution.map((cat, i) => (
                  <div key={cat.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-foreground truncate flex-1 pr-2">{cat.label}</span>
                      <span className="text-xs font-semibold text-foreground shrink-0">{cat.count}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", BAR_COLORS[i % BAR_COLORS.length])}
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground">No data available</div>
            )}
          </div>

          {/* Performance Metrics (Dynamic where possible) */}
          <div className="bg-white border border-border rounded-lg p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Performance Overview</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-3.5 bg-muted/40 rounded-lg">
                <div className="text-lg font-bold text-foreground mb-0.5">
                  {stats?.avg_resolution_days ? `${stats.avg_resolution_days.toFixed(1)} days` : "N/A"}
                </div>
                <div className="text-[11px] font-medium text-foreground/80 mb-0.5">Avg Resolution Time</div>
                <div className="text-[10px] text-muted-foreground">Based on resolved cases</div>
              </div>
              <div className="p-3.5 bg-muted/40 rounded-lg">
                <div className="text-lg font-bold text-foreground mb-0.5">
                  {stats?.in_progress || 0}
                </div>
                <div className="text-[11px] font-medium text-foreground/80 mb-0.5">Active Cases</div>
                <div className="text-[10px] text-muted-foreground">Currently being worked on</div>
              </div>
              <div className="p-3.5 bg-muted/40 rounded-lg">
                <div className="text-lg font-bold text-foreground mb-0.5">
                  {stats && stats.total > 0
                    ? `${((stats.duplicates_caught / stats.total) * 100).toFixed(1)}%`
                    : "0%"}
                </div>
                <div className="text-[11px] font-medium text-foreground/80 mb-0.5">Duplicate Rate</div>
                <div className="text-[10px] text-muted-foreground">Efficiency metric</div>
              </div>
            </div>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText size={14} className="text-primary" />
              Recent Complaints
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 border border-border rounded-md px-3 py-1.5 bg-background">
                <Filter size={12} className="text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs text-foreground bg-transparent outline-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="registered">Registered</option>
                  <option value="verified">Verified</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Ref ID", "Title", "Category", "Location", "Date", "Priority", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    className={cn("border-b border-border last:border-0 hover:bg-muted/20 transition-colors", i % 2 === 0 ? "" : "bg-muted/10")}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{c.reference_id}</td>
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px]">
                      <span className="line-clamp-1 block text-xs" title={c.title}>{c.title}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{c.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground" title={c.location}>
                        <MapPin size={10} />
                        <span className="truncate max-w-[100px]">{c.location}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium capitalize", PRIORITY_CONFIG[c.priority] || "bg-gray-100 text-gray-700")}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap", STATUS_CONFIG[c.status]?.cls || "bg-gray-100 text-gray-700")}>
                        {STATUS_CONFIG[c.status]?.label || c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/track?id=${c.reference_id}`)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No complaints found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} recent complaints
            </p>
            {/* Pagination could go here */}
          </div>
        </div>
      </div>
    </div>
  );
}
