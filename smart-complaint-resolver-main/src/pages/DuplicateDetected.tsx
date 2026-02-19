import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ExternalLink,
  Info,
  ChevronRight,
  GitMerge,
  MapPin,
  Tag,
  Calendar,
  CheckCircle2,
  FilePlus2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const STATUS_COLORS: Record<string, string> = {
  registered: "bg-blue-100 text-blue-700 border-blue-200",
  verified: "bg-purple-100 text-purple-700 border-purple-200",
  assigned: "bg-orange-100 text-orange-700 border-orange-200",
  in_progress: "bg-yellow-100 text-yellow-700 border-yellow-200",
  resolved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

export default function DuplicateDetected() {
  const navigate = useNavigate();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("analysisResult");
    if (!stored) { navigate("/submit"); return; }
    const parsed: AnalysisResult = JSON.parse(stored);
    setResult(parsed);

    // Animate similarity score
    const target = parsed.duplicate_match?.similarity_score ?? 87;
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setAnimatedScore(Math.round(current));
      if (current >= target) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [navigate]);

  const match = result?.duplicate_match;
  const factorScores = match?.factor_scores;

  const handleRegisterAnyway = () => {
    navigate("/submit");
  };

  if (!result || !match) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight size={14} />
        <Link to="/submit" className="hover:text-foreground">Submit</Link>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">Duplicate Detected</span>
      </div>

      {/* Alert Banner */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-8">
        <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-yellow-800 mb-0.5">Potential Duplicate Complaint Detected</p>
          <p className="text-xs text-yellow-700 leading-relaxed">
            {result?.message || "Our AI system found an existing complaint with a high similarity score. Review the details below before deciding to proceed."}
          </p>
        </div>
      </div>

      {/* Similarity Score */}
      <div className="bg-white border border-border rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Circular score */}
          <div className="flex-shrink-0">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="8"
                />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="hsl(var(--warning))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(animatedScore / 100) * 263.9} 263.9`}
                  className="transition-all duration-100"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{animatedScore}%</span>
                <span className="text-[10px] text-muted-foreground font-medium">Similarity</span>
              </div>
            </div>
          </div>

          {/* Score explanation */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-semibold text-foreground mb-1">High Similarity Score</h2>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              The AI model determined your complaint is <strong>{animatedScore}% similar</strong> to an
              existing complaint. Complaints above 75% similarity are flagged as potential duplicates.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full bg-yellow-100 border border-yellow-200 text-xs font-medium text-yellow-700">
                AI Confidence: High
              </span>
              <span className="px-2.5 py-1 rounded-full bg-red-100 border border-red-200 text-xs font-medium text-red-700">
                Flagged: Duplicate
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Complaint */}
      <div className="bg-white border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <GitMerge size={14} className="text-primary" />
            Matching Existing Complaint
          </h3>
          <span className={cn("px-2.5 py-1 rounded-full border text-xs font-medium", STATUS_COLORS[match.status] ?? "bg-gray-100 text-gray-700")}>
            {match.status.replace("_", " ")}
          </span>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <span className="text-xs text-muted-foreground font-medium font-mono">{match.reference_id}</span>
              <h4 className="text-sm font-semibold text-foreground mt-0.5">{match.title}</h4>
            </div>
            <Link
              to={`/track?id=${match.reference_id}`}
              className="text-primary hover:underline flex items-center gap-1 text-xs shrink-0"
            >
              Track <ExternalLink size={11} />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{match.reasoning}</p>
          <div className="flex flex-wrap gap-3">
            {[
              { icon: Tag, text: match.category },
              { icon: MapPin, text: match.location },
              { icon: Calendar, text: formatDate(match.created_at) },
            ].map((item) => (
              <span key={item.text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <item.icon size={11} />
                {item.text}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <CheckCircle2 size={14} className="text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Your concern has been <strong>noted and linked</strong> to the existing complaint.
            Track its progress to stay updated.
          </p>
        </div>
      </div>

      {/* AI Reasoning */}
      {factorScores && (
        <div className="bg-white border border-border rounded-lg p-6 mb-6">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Info size={14} className="text-primary" />
            AI Similarity Breakdown
          </h3>
          <div className="space-y-3">
            {[
              { factor: "Text & Keyword Similarity", score: Math.round(factorScores.text_similarity), desc: "Semantic similarity of title and description" },
              { factor: "Location Match", score: Math.round(factorScores.location_match), desc: "Geographic overlap of complaint locations" },
              { factor: "Category Match", score: Math.round(factorScores.category_match), desc: "Same complaint category classification" },
            ].map((reason) => (
              <div key={reason.factor}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{reason.factor}</span>
                  <span className="text-xs font-semibold text-foreground">{reason.score}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: `${reason.score}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{reason.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white border border-border rounded-lg p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">What would you like to do?</h3>
        <p className="text-xs text-muted-foreground mb-4">
          We recommend tracking the existing complaint, but you may still register a new one if your issue is different.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to={`/track?id=${match.reference_id}`} className="flex-1">
            <Button className="w-full gap-2" size="lg">
              Track Existing Complaint
              <ChevronRight size={15} />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="flex-1 gap-2 text-muted-foreground"
            onClick={handleRegisterAnyway}
          >
            <FilePlus2 size={15} />
            Register Separately
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 text-center">
          Registering a separate complaint for a known duplicate may delay resolution.
        </p>
      </div>
    </div>
  );
}
