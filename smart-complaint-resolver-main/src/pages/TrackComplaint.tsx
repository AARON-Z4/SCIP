import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
    Search, MapPin, Tag, Calendar, AlertCircle, CheckCircle2,
    Clock, XCircle, BarChart2, MessageSquare, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { complaintsApi, ComplaintOut } from "@/lib/api";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    registered: { label: "Registered", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
    verified: { label: "Verified", color: "bg-purple-100 text-purple-700 border-purple-200", icon: CheckCircle2 },
    assigned: { label: "Assigned", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Clock },
    in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
    resolved: { label: "Resolved", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

const STATUS_ORDER = ["registered", "verified", "assigned", "in_progress", "resolved"];

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function TrackComplaint() {
    const [searchParams] = useSearchParams();
    const [referenceId, setReferenceId] = useState(searchParams.get("id") ?? "");
    const [complaint, setComplaint] = useState<ComplaintOut | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Auto-search if ID passed via query param
    useEffect(() => {
        if (searchParams.get("id")) {
            handleSearch(searchParams.get("id")!);
        }
    }, []);

    const handleSearch = async (id?: string) => {
        const query = (id ?? referenceId).trim();
        if (!query) { setError("Please enter a reference ID."); return; }
        setError("");
        setLoading(true);
        setSearched(false);
        setComplaint(null);
        try {
            const data = await complaintsApi.track(query);
            setComplaint(data);
            setSearched(true);
        } catch (err: any) {
            setError(err.message?.includes("not found") || err.message?.includes("404")
                ? "No complaint found with this reference ID. Please check and try again."
                : err.message || "Failed to fetch complaint. Please try again.");
            setSearched(true);
        } finally {
            setLoading(false);
        }
    };

    const currentStatusIdx = complaint
        ? STATUS_ORDER.indexOf(complaint.status.toLowerCase())
        : -1;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Link to="/" className="hover:text-foreground">Home</Link>
                    <ChevronRight size={14} />
                    <span className="text-foreground font-medium">Track Complaint</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Track Your Complaint</h1>
                <p className="text-sm text-muted-foreground">
                    Enter your complaint reference ID to view its current status and history.
                </p>
            </div>

            {/* Search Box */}
            <div className="bg-white border border-border rounded-lg p-6 mb-6">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            id="track-reference-id"
                            placeholder="e.g. GRV-2026-12345"
                            value={referenceId}
                            onChange={(e) => { setReferenceId(e.target.value); setError(""); }}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className={cn(
                                "w-full pl-9 pr-3 py-2.5 text-sm rounded-md border outline-none transition-colors",
                                "placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary",
                                error ? "border-destructive" : "border-border"
                            )}
                        />
                    </div>
                    <Button
                        onClick={() => handleSearch()}
                        id="track-search-btn"
                        className="gap-2 h-10 px-5"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                            <Search size={15} />
                        )}
                        {loading ? "Searching..." : "Track"}
                    </Button>
                </div>
                {error && !complaint && (
                    <div className="flex items-center gap-2 mt-3 text-xs text-destructive">
                        <AlertCircle size={12} />
                        {error}
                    </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                    Reference IDs are in the format <code className="font-mono bg-muted px-1 rounded">GRV-YYYY-#####</code>
                </p>
            </div>

            {/* Results */}
            {complaint && (
                <div className="space-y-5 animate-fade-in">
                    {/* Status Banner */}
                    {(() => {
                        const cfg = STATUS_CONFIG[complaint.status] ?? STATUS_CONFIG.registered;
                        const Icon = cfg.icon;
                        return (
                            <div className={cn("flex items-center gap-3 p-4 rounded-lg border", cfg.color)}>
                                <Icon size={18} className="flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold">Status: {cfg.label}</p>
                                    <p className="text-xs opacity-80">Last updated: {formatDate(complaint.updated_at)}</p>
                                </div>
                                <span className={cn("ml-auto px-3 py-1 rounded-full text-xs font-semibold border", cfg.color)}>
                                    {cfg.label}
                                </span>
                            </div>
                        );
                    })()}

                    {/* Complaint Details */}
                    <div className="bg-white border border-border rounded-lg p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <span className="text-xs font-mono text-muted-foreground">{complaint.reference_id}</span>
                                <h2 className="text-lg font-semibold text-foreground mt-0.5">{complaint.title}</h2>
                            </div>
                            <span className={cn(
                                "px-2.5 py-1 rounded-full border text-xs font-medium shrink-0",
                                complaint.priority === "high"
                                    ? "bg-red-100 text-red-700 border-red-200"
                                    : complaint.priority === "medium"
                                        ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                        : "bg-green-100 text-green-700 border-green-200"
                            )}>
                                {complaint.priority.charAt(0).toUpperCase() + complaint.priority.slice(1)} Priority
                            </span>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{complaint.description}</p>

                        <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
                            {[
                                { icon: Tag, label: complaint.category },
                                { icon: MapPin, label: complaint.location },
                                { icon: Calendar, label: formatDate(complaint.created_at) },
                            ].map((item) => (
                                <span key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <item.icon size={12} className="text-primary/70" />
                                    {item.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Progress Timeline */}
                    <div className="bg-white border border-border rounded-lg p-6">
                        <h3 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
                            <BarChart2 size={14} className="text-primary" />
                            Resolution Progress
                        </h3>
                        <div className="relative">
                            {/* Track line */}
                            <div className="absolute left-3.5 top-3 bottom-3 w-0.5 bg-border" />
                            <div className="space-y-5">
                                {STATUS_ORDER.map((status, idx) => {
                                    const cfg = STATUS_CONFIG[status];
                                    const isDone = idx <= currentStatusIdx;
                                    const isActive = idx === currentStatusIdx;
                                    return (
                                        <div key={status} className="flex items-start gap-4 relative">
                                            <div className={cn(
                                                "w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 bg-white transition-colors",
                                                isDone ? "border-primary bg-primary" : "border-border"
                                            )}>
                                                {isDone
                                                    ? <CheckCircle2 size={13} className="text-white" />
                                                    : <div className="w-2 h-2 rounded-full bg-border" />
                                                }
                                            </div>
                                            <div className={cn("flex-1 pb-1", !isDone && "opacity-40")}>
                                                <p className={cn(
                                                    "text-sm font-medium",
                                                    isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                                                )}>
                                                    {cfg.label}
                                                    {isActive && (
                                                        <span className="ml-2 text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                                            Current
                                                        </span>
                                                    )}
                                                </p>
                                                {isActive && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {formatDate(complaint.updated_at)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Comments */}
                    {complaint.comments && complaint.comments.length > 0 && (
                        <div className="bg-white border border-border rounded-lg p-6">
                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <MessageSquare size={14} className="text-primary" />
                                Official Comments ({complaint.comments.length})
                            </h3>
                            <div className="space-y-3">
                                {complaint.comments.map((comment: any, i: number) => (
                                    <div key={i} className="flex gap-3 p-3 bg-muted/40 rounded-lg">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary">
                                            {(comment.author_name ?? "A").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-semibold text-foreground">{comment.author_name ?? "Admin Officer"}</p>
                                                <p className="text-[11px] text-muted-foreground shrink-0">{formatDate(comment.created_at)}</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{comment.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Link to="/submit" className="flex-1">
                            <Button variant="outline" className="w-full gap-2 h-10">
                                Submit Another Complaint
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            className="gap-2 h-10 text-muted-foreground"
                            onClick={() => { setComplaint(null); setSearched(false); setReferenceId(""); }}
                        >
                            Search Again
                        </Button>
                    </div>
                </div>
            )}

            {/* Empty state — no search yet */}
            {!searched && !loading && !complaint && (
                <div className="text-center py-16 text-muted-foreground">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <Search size={28} className="text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium">Enter your reference ID above to get started</p>
                    <p className="text-xs mt-1">Your reference ID was provided when your complaint was registered.</p>
                </div>
            )}
        </div>
    );
}
