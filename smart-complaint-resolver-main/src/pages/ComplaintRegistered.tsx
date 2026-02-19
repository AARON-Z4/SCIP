import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Copy,
  Download,
  Search,
  FilePlus2,
  Bell,
  Calendar,
  Tag,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/api";

const NEXT_STEPS = [
  { icon: Bell, text: "You'll receive email and SMS updates as your complaint progresses." },
  { icon: Search, text: "Track your complaint status anytime using the Tracking page." },
  { icon: Calendar, text: "An officer will be assigned within 2 working days of registration." },
];

export default function ComplaintRegistered() {
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("analysisResult");
    if (stored) {
      try { setResult(JSON.parse(stored)); } catch { }
    }
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  const complaint = result?.complaint;  // the real ComplaintOut from API
  const referenceId = complaint?.reference_id ?? "—";

  const handleCopy = () => {
    navigator.clipboard.writeText(referenceId).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };




  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Success Header */}
      <div
        className={cn(
          "text-center mb-8 transition-all duration-500",
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <div className="w-20 h-20 rounded-full bg-green-100 border-2 border-green-200 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Complaint Registered Successfully
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Your complaint has been recorded and assigned a unique tracking ID. Please save this ID for
          future reference.
        </p>
      </div>

      {/* Complaint ID Card */}
      <div
        className={cn(
          "bg-white border border-border rounded-lg p-6 mb-6 transition-all duration-500 delay-100",
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Your Complaint Reference ID
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-lg font-bold text-foreground tracking-wider border border-border">
            {referenceId}
          </div>
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1.5 px-4 py-3 rounded-lg border text-sm font-medium transition-all",
              copied
                ? "bg-green-100 border-green-200 text-green-700"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Copy size={14} />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Use this ID to track your complaint status. Keep it safe — you cannot retrieve it later without email verification.
        </p>
      </div>

      {complaint && (
        <div
          className={cn(
            "bg-white border border-border rounded-lg p-6 mb-6 transition-all duration-500 delay-200",
            show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">Complaint Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Tag, label: "Category", value: complaint.category },
              { icon: MapPin, label: "Location", value: complaint.location },
              { icon: Calendar, label: "Submitted On", value: new Date(complaint.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
              { icon: CheckCircle2, label: "Priority", value: complaint.priority.charAt(0).toUpperCase() + complaint.priority.slice(1) },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <item.icon size={14} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">{item.label}</p>
                  <p className="text-xs font-medium text-foreground">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <p className="text-[11px] text-muted-foreground mb-0.5">Complaint Title</p>
            <p className="text-xs font-medium text-foreground">{complaint.title}</p>
          </div>
        </div>
      )}

      {/* Status Timeline Preview */}
      <div
        className={cn(
          "bg-white border border-border rounded-lg p-6 mb-6 transition-all duration-500 delay-300",
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <h2 className="text-sm font-semibold text-foreground mb-4">Current Status</h2>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 status-pulse" />
          <span className="text-sm font-medium text-blue-700">Registered — Awaiting Assignment</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {complaint ? new Date(complaint.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
        <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full w-[8%]" />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Your complaint is in the queue and will be assigned to the relevant department shortly.
        </p>
      </div>

      {/* Next Steps */}
      <div
        className={cn(
          "bg-white border border-border rounded-lg p-6 mb-8 transition-all duration-500 delay-[400ms]",
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <h2 className="text-sm font-semibold text-foreground mb-4">What Happens Next?</h2>
        <div className="space-y-3">
          {NEXT_STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                <step.icon size={13} className="text-primary" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1">{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div
        className={cn(
          "flex flex-col sm:flex-row gap-3 transition-all duration-500 delay-500",
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <Link to={`/track?id=${referenceId}`} className="flex-1">
          <Button size="lg" className="w-full gap-2 h-11">
            <Search size={15} />
            Track This Complaint
          </Button>
        </Link>
        <Link to="/submit" className="flex-1">
          <Button variant="outline" size="lg" className="w-full gap-2 h-11">
            <FilePlus2 size={15} />
            Submit Another
          </Button>
        </Link>
        <Link to="/">
          <Button variant="ghost" size="lg" className="w-full sm:w-auto h-11 gap-1.5 text-muted-foreground">
            Back to Home
            <ArrowRight size={14} />
          </Button>
        </Link>
      </div>
    </div>
  );
}
