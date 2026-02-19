import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload, X, MapPin, Tag, FileText, User, Phone, Mail,
  AlertCircle, ImagePlus, ChevronRight, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { complaintsApi, AnalysisResult } from "@/lib/api";

const CATEGORIES = [
  "Select a category",
  "Road & Infrastructure",
  "Water Supply",
  "Electricity",
  "Sanitation & Waste Management",
  "Public Safety & Law Enforcement",
  "Education Services",
  "Healthcare Services",
  "Environmental Concerns",
  "Transport & Traffic",
  "Municipal & Local Services",
  "Other",
];

const PRIORITIES = [
  { value: "low", label: "Low", desc: "Non-urgent issue", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "medium", label: "Medium", desc: "Moderate urgency", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "high", label: "High", desc: "Needs prompt attention", color: "bg-red-100 text-red-700 border-red-200" },
];

interface FormData {
  category: string;
  location: string;
  title: string;
  description: string;
  priority: string;
  images: File[];
}

interface Errors {
  [key: string]: string;
}

export default function SubmitComplaint() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    category: "",
    location: "",
    title: "",
    description: "",
    priority: "medium",
    images: [],
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - form.images.length;
    const newFiles = files.slice(0, remaining);
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    setForm((prev) => ({ ...prev, images: [...prev.images, ...newFiles] }));
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Errors = {};
    if (!form.category || form.category === "Select a category")
      newErrors.category = "Please select a category";
    if (!form.location.trim() || form.location.trim().length < 3)
      newErrors.location = "Location must be at least 3 characters";
    if (!form.title.trim()) newErrors.title = "Complaint title is required";
    if (form.description.trim().length < 30)
      newErrors.description = "Description must be at least 30 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate("/signin");
      return;
    }
    if (!validate()) return;
    setApiError("");
    setLoading(true);

    try {
      const result: AnalysisResult = await complaintsApi.submit({
        title: form.title,
        description: form.description,
        category: form.category,
        location: form.location,
        priority: form.priority as "low" | "medium" | "high",
        image_urls: [],  // Images uploaded separately in future
      });

      // Store result for the downstream pages to consume
      sessionStorage.setItem("analysisResult", JSON.stringify(result));

      if (result.is_duplicate) {
        navigate("/duplicate");
      } else {
        navigate("/registered");
      }
    } catch (err: any) {
      setApiError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // Not logged in — show a prompt
  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
          <Lock size={28} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Sign In Required</h1>
        <p className="text-sm text-muted-foreground mb-6">
          You must be signed in to submit a complaint. Your identity is associated with the complaint for follow-up.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate("/signin")} className="gap-2">
            Sign In
          </Button>
          <Button variant="outline" onClick={() => navigate("/signup")} className="gap-2">
            Create Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <span>Home</span>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Submit Complaint</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Submit a Complaint</h1>
        <p className="text-sm text-muted-foreground">
          Fill in the form below accurately. All fields marked with{" "}
          <span className="text-destructive font-medium">*</span> are required.
        </p>
      </div>

      {/* API Error */}
      {apiError && (
        <div className="flex items-start gap-2.5 p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Submission Failed</p>
            <p className="text-xs text-red-700 mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Submitter Info (auto-filled) */}
        <div className="bg-white border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-5 flex items-center gap-2">
            <User size={14} className="text-primary" />
            Submitting As
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-muted/40 rounded-md">
              <p className="text-[11px] text-muted-foreground mb-0.5 flex items-center gap-1">
                <User size={10} /> Full Name
              </p>
              <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-md">
              <p className="text-[11px] text-muted-foreground mb-0.5 flex items-center gap-1">
                <Mail size={10} /> Email
              </p>
              <p className="text-sm font-medium text-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Complaint Details */}
        <div className="bg-white border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-5 flex items-center gap-2">
            <FileText size={14} className="text-primary" />
            Complaint Details
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldBlock label="Category" required error={errors.category} icon={<Tag size={14} />}>
                <select
                  value={form.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className={cn(inputClass(!!errors.category), "bg-white")}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat === "Select a category" ? "" : cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </FieldBlock>
              <FieldBlock label="Location / Area" required error={errors.location} icon={<MapPin size={14} />}>
                <input
                  type="text"
                  placeholder="e.g. Sector 14, New Delhi"
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  className={inputClass(!!errors.location)}
                />
              </FieldBlock>
            </div>

            <FieldBlock label="Complaint Title" required error={errors.title} icon={<FileText size={14} />}>
              <input
                type="text"
                placeholder="Brief title describing your complaint"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className={inputClass(!!errors.title)}
              />
            </FieldBlock>

            <FieldBlock
              label="Detailed Description"
              required
              error={errors.description}
              hint={`${form.description.length} chars (min 30)`}
            >
              <textarea
                rows={5}
                placeholder="Provide a detailed description of your complaint. Include when it started, how it affects you, and any previous attempts to resolve it..."
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className={cn(inputClass(!!errors.description), "resize-none")}
              />
            </FieldBlock>
          </div>
        </div>

        {/* Priority */}
        <div className="bg-white border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-5 flex items-center gap-2">
            <AlertCircle size={14} className="text-primary" />
            Priority Level
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {PRIORITIES.map((p) => (
              <label
                key={p.value}
                className={cn(
                  "flex flex-col items-center gap-1.5 border rounded-lg p-3 cursor-pointer transition-all",
                  form.priority === p.value
                    ? `${p.color} border-current ring-2 ring-offset-1 ring-current/30`
                    : "border-border hover:border-primary/40 hover:bg-accent"
                )}
              >
                <input
                  type="radio"
                  name="priority"
                  value={p.value}
                  checked={form.priority === p.value}
                  onChange={() => handleChange("priority", p.value)}
                  className="sr-only"
                />
                <span className="text-sm font-semibold">{p.label}</span>
                <span className="text-[11px] text-center">{p.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Image Upload */}
        <div className="bg-white border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
            <ImagePlus size={14} className="text-primary" />
            Supporting Images
            <span className="text-xs font-normal text-muted-foreground normal-case tracking-normal">
              (optional, up to 3)
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Upload photos that support your complaint (JPG, PNG, WEBP · max 5MB each).
          </p>

          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group">
                  <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={11} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {form.images.length < 3 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Upload size={18} className="text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                <span className="font-medium text-primary">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">{3 - form.images.length} image(s) remaining</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs text-muted-foreground">
            By submitting, you agree to our Terms of Service and Privacy Policy.
          </p>
          <Button
            type="submit"
            id="submit-complaint-btn"
            size="lg"
            className="gap-2 h-11 px-8 font-medium w-full sm:w-auto"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                Submitting & Analyzing...
              </>
            ) : (
              <>
                Submit & Analyze
                <ChevronRight size={16} />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function FieldBlock({
  label, required, error, hint, icon, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {label}
        {required && <span className="text-destructive">*</span>}
        {hint && !error && <span className="ml-auto text-muted-foreground font-normal">{hint}</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full px-3 py-2.5 text-sm rounded-md border outline-none transition-colors",
    "placeholder:text-muted-foreground/60",
    "focus:ring-2 focus:ring-primary/20 focus:border-primary",
    hasError
      ? "border-destructive bg-red-50/50 focus:ring-destructive/20 focus:border-destructive"
      : "border-border bg-background hover:border-primary/40"
  );
}
