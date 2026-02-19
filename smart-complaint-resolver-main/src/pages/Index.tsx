import { Link } from "react-router-dom";
import {
  Shield,
  FilePlus2,
  Search,
  BrainCircuit,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Statistics removed as per user request (was hard-coded values)
const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Submit Your Complaint",
    desc: "Fill in the details of your complaint — category, location, description, and supporting images.",
    icon: FilePlus2,
  },
  {
    step: "02",
    title: "AI Analysis",
    desc: "Our AI engine analyzes your complaint for duplicates, categorizes it, and assigns a priority level.",
    icon: BrainCircuit,
  },
  {
    step: "03",
    title: "Track & Resolve",
    desc: "Track your complaint's real-time status through our timeline tracker until resolution.",
    icon: Search,
  },
];

const CATEGORIES = [
  "Road & Infrastructure",
  "Water Supply",
  "Electricity",
  "Sanitation & Waste",
  "Public Safety",
  "Education",
  "Healthcare",
  "Environment",
  "Transport",
  "Municipal Services",
];

export default function Index() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 status-pulse" />
              <span className="text-xs font-medium text-blue-700">AI-Powered Grievance Management</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-5 leading-tight">
              Smart Complaint
              <br />
              <span className="text-primary">Intelligence System</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl leading-relaxed">
              A unified platform for citizens to register, track, and resolve grievances. Our AI engine
              eliminates duplicates, prioritizes issues, and ensures every complaint receives timely attention.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/submit">
                <Button size="lg" className="gap-2 h-11 px-6 font-medium">
                  <FilePlus2 size={16} />
                  Submit a Complaint
                </Button>
              </Link>
              <Link to="/track">
                <Button size="lg" variant="outline" className="gap-2 h-11 px-6 font-medium">
                  <Search size={16} />
                  Track Your Complaint
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-background py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              A simple, transparent three-step process powered by artificial intelligence.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="relative flex flex-col">
                <div className="bg-white border border-border rounded-lg p-6 flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-3xl font-bold text-border select-none">{step.step}</span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background border border-border items-center justify-center">
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white border-t border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Complaint Categories</h2>
            <p className="text-sm text-muted-foreground">
              We handle a wide range of civic issues across all departments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <span
                key={cat}
                className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium border border-border hover:border-primary hover:bg-accent hover:text-accent-foreground transition-colors cursor-default"
              >
                {cat}
              </span>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/submit">
              <Button size="lg" className="gap-2 h-11 px-8 font-medium">
                File a Complaint Now
                <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Banner */}
      <section className="bg-muted border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: BrainCircuit, title: "AI Duplicate Detection", desc: "Automatically detects and links duplicate complaints to avoid redundancy." },
              { icon: Shield, title: "Secure & Private", desc: "All personal data is encrypted in transit and at rest per government standards." },
              { icon: Search, title: "Real-time Tracking", desc: "Live status updates with a visual timeline from submission to resolution." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-md bg-white border border-border flex items-center justify-center flex-shrink-0">
                  <f.icon size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
