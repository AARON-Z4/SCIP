import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

import { supabase } from "@/lib/supabase";

export default function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Invalid email or password. Please try again.");
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
      setError(err.message || "Google sign in failed.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-114px)] flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Shield size={22} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Sign In</h1>
          <p className="text-sm text-muted-foreground">Access your SCIS account</p>
        </div>

        <div className="bg-white border border-border rounded-lg p-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3 mb-4 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
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
              Sign in with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Mail size={12} className="text-muted-foreground" /> Email Address
                </label>
                <input
                  type="email"
                  id="signin-email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm rounded-md border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground/60"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Lock size={12} className="text-muted-foreground" /> Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    id="signin-password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2.5 pr-10 text-sm rounded-md border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground/60"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Demo credentials hint */}
              <div className="p-2.5 bg-muted/60 rounded-md">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold">Admin demo:</span>{" "}
                  admin@scis.gov.in / Admin@1234
                </p>
              </div>

              <Button
                type="submit"
                id="signin-submit"
                className="w-full gap-2 h-10"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <LogIn size={15} />
                )}
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
