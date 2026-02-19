/**
 * AIAnalysis.tsx
 * Shows an animated progress screen while waiting for the API result.
 * The actual API call is made in SubmitComplaint; the result is passed
 * via sessionStorage("analysisResult"). This page purely animates, then
 * redirects based on the stored result.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Loader2, BrainCircuit, Search, Shield, FileCheck, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ANALYSIS_STEPS = [
  {
    id: 1, icon: FileCheck,
    title: "Parsing Complaint Content",
    desc: "Extracting key entities: category, location, keywords, and timestamp...",
    duration: 1800,
  },
  {
    id: 2, icon: Search,
    title: "Searching Complaint Database",
    desc: "Querying historical complaints for semantic similarity via Gemini embeddings...",
    duration: 2200,
  },
  {
    id: 3, icon: BrainCircuit,
    title: "Running AI Similarity Model",
    desc: "Applying NLP-based cosine similarity and location proximity analysis...",
    duration: 2400,
  },
  {
    id: 4, icon: Shield,
    title: "Verifying Duplicate Threshold",
    desc: "Checking if similarity score exceeds the 75% duplicate detection threshold...",
    duration: 1600,
  },
  {
    id: 5, icon: Zap,
    title: "Generating AI Decision",
    desc: "Formulating explainable AI reasoning and preparing the outcome report...",
    duration: 1200,
  },
];

type StepStatus = "pending" | "active" | "done";

export default function AIAnalysis() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(
    ANALYSIS_STEPS.map(() => "pending")
  );
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    // Check if we have a result already (fast API response)
    const stored = sessionStorage.getItem("analysisResult");
    if (!stored) {
      // No result yet — user navigated here directly, send back to submit
      navigate("/submit");
      return;
    }

    let stepIndex = 0;
    const totalDuration = ANALYSIS_STEPS.reduce((acc, s) => acc + s.duration, 0);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 80;
      setOverallProgress(Math.min(100, Math.round((elapsed / totalDuration) * 100)));
    }, 80);

    const runStep = (index: number) => {
      if (index >= ANALYSIS_STEPS.length) {
        clearInterval(interval);
        setOverallProgress(100);

        // Navigate to the right result page
        setTimeout(() => {
          try {
            const result = JSON.parse(stored);
            navigate(result.is_duplicate ? "/duplicate" : "/registered");
          } catch {
            navigate("/registered");
          }
        }, 600);
        return;
      }

      setCurrentStep(index);
      setStepStatuses((prev) => {
        const next = [...prev];
        next[index] = "active";
        return next;
      });

      setTimeout(() => {
        setStepStatuses((prev) => {
          const next = [...prev];
          next[index] = "done";
          return next;
        });
        runStep(index + 1);
      }, ANALYSIS_STEPS[index].duration);
    };

    runStep(0);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-[calc(100vh-57px)] flex flex-col items-center justify-center bg-background">
      <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
            <BrainCircuit className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Analyzing Your Complaint</h1>
          <p className="text-sm text-muted-foreground">
            Our AI engine is processing your submission using Gemini embeddings and cosine similarity.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Overall Progress</span>
            <span className="text-xs font-semibold text-primary">{overallProgress}%</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white border border-border rounded-lg divide-y divide-border">
          {ANALYSIS_STEPS.map((step, i) => {
            const status = stepStatuses[i];
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-start gap-4 p-4 transition-all",
                  status === "active" && "bg-accent/40"
                )}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {status === "done" ? (
                    <div className="w-8 h-8 rounded-full bg-green-100 border border-green-200 flex items-center justify-center">
                      <CheckCircle2 size={16} className="text-green-600" />
                    </div>
                  ) : status === "active" ? (
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <Loader2 size={16} className="text-primary animate-spin" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                      <Icon size={14} className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        status === "done"
                          ? "text-foreground"
                          : status === "active"
                            ? "text-primary"
                            : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                        status === "done"
                          ? "bg-green-100 text-green-700"
                          : status === "active"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {status === "done" ? "Done" : status === "active" ? "Running" : "Pending"}
                    </span>
                  </div>
                  {status !== "pending" && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {step.desc}
                    </p>
                  )}
                  {status === "active" && (
                    <div className="mt-2 h-1 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary/50 shimmer rounded-full w-full" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Do not refresh or close this page. Analysis typically completes in under 15 seconds.
        </p>
      </div>
    </div>
  );
}
