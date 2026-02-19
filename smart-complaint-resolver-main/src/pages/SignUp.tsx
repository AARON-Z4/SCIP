import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, User, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

import { supabase } from "@/lib/supabase";

export default function SignUp() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = "Full name must be at least 2 characters.";
    if (!form.email.includes("@"))
      errs.email = "Please enter a valid email address.";
    if (form.password.length < 8)
      errs.password = "Password must be at least 8 characters.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setApiError("");
    setLoading(true);
    try {
      await register(form.name.trim(), form.email, form.password);
      navigate("/");
    } catch (err: any) {
      setApiError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Google sign up failed.");
    }
  };

  const pwStrength =
    form.password.length === 0
      ? null
      : form.password.length < 8
        ? "weak"
        : /[A-Z]/.test(form.password) && /[0-9]/.test(form.password)
          ? "strong"
          : "medium";

  return (
    <div className="min-h-[calc(100vh-114px)] flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Shield size={22} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Create Account</h1>
          <p className="text-sm text-muted-foreground">Register to file and track complaints</p>
        </div>

        <div className="bg-white border border-border rounded-lg p-6">
          {apiError && (
            <div className="flex items-start gap-2.5 p-3 mb-4 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{apiError}</p>
            </div>
          )}

          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 h-10"
              onClick={handleGoogleLogin}
            >
              <svg className="h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Sign up with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or register with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <User size={12} className="text-muted-foreground" /> Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="signup-name"
                  type="text"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, name: e.target.value }));
                    if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                  }}
                  className={`w-full px-3 py-2.5 text-sm rounded-md border outline-none transition-colors focus:ring-2 placeholder:text-muted-foreground/60 ${errors.name
                    ? "border-destructive focus:ring-destructive/20 bg-red-50/50"
                    : "border-border focus:ring-primary/20 focus:border-primary bg-background"
                    }`}
                  autoComplete="name"
                />
                {errors.name && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Mail size={12} className="text-muted-foreground" /> Email Address <span className="text-destructive">*</span>
                </label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, email: e.target.value }));
                    if (errors.email) setErrors((p) => ({ ...p, email: "" }));
                  }}
                  className={`w-full px-3 py-2.5 text-sm rounded-md border outline-none transition-colors focus:ring-2 placeholder:text-muted-foreground/60 ${errors.email
                    ? "border-destructive focus:ring-destructive/20 bg-red-50/50"
                    : "border-border focus:ring-primary/20 focus:border-primary bg-background"
                    }`}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Lock size={12} className="text-muted-foreground" /> Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPw ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, password: e.target.value }));
                      if (errors.password) setErrors((p) => ({ ...p, password: "" }));
                    }}
                    className={`w-full px-3 py-2.5 pr-10 text-sm rounded-md border outline-none transition-colors focus:ring-2 placeholder:text-muted-foreground/60 ${errors.password
                      ? "border-destructive focus:ring-destructive/20 bg-red-50/50"
                      : "border-border focus:ring-primary/20 focus:border-primary bg-background"
                      }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* Password strength */}
                {pwStrength && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {["weak", "medium", "strong"].map((level, i) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${pwStrength === "weak" && i === 0
                            ? "bg-red-400"
                            : pwStrength === "medium" && i <= 1
                              ? "bg-yellow-400"
                              : pwStrength === "strong"
                                ? "bg-green-500"
                                : "bg-muted"
                            }`}
                        />
                      ))}
                    </div>
                    <span
                      className={`text-[10px] font-medium capitalize ${pwStrength === "weak"
                        ? "text-red-500"
                        : pwStrength === "medium"
                          ? "text-yellow-600"
                          : "text-green-600"
                        }`}
                    >
                      {pwStrength}
                    </span>
                  </div>
                )}
                {errors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                id="signup-submit"
                className="w-full gap-2 h-10"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <UserPlus size={15} />
                )}
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link to="/signin" className="text-primary hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
