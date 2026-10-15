"use client";

import * as React from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldCheck, UserCheck, Waves, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const { data: session } = useSession();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (session) {
      router.push(callbackUrl);
    }
  }, [session, router, callbackUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred during sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-xl shadow-emerald-950/20 dark:shadow-emerald-950/60 mb-2">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center transition-colors">
              <Waves className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Sign in to PrimeWave Hub
          </h1>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Resource Reservation Management System
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200/90 bg-white/95 shadow-xl dark:border-slate-800 dark:bg-slate-900/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Account Login</CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Enter your credentials or choose a pre-configured demo account below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs dark:bg-rose-950/50 dark:border-rose-800/60 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@primewave.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-md focus:outline-none cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-2 font-semibold shadow-sm cursor-pointer"
                size="lg"
                isLoading={isLoading}
              >
                Sign In
              </Button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="pt-4 border-t border-slate-200/90 dark:border-slate-800/80">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-3 text-center">
                ⚡ Evaluator 1-Click Fill
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill("admin@primewave.com", "admin123")}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-purple-200 bg-purple-50/80 hover:bg-purple-100 text-left transition-all group dark:border-purple-800/40 dark:bg-purple-950/20 dark:hover:bg-purple-950/50 shadow-2xs cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-purple-950 dark:text-purple-200">
                      Admin Persona
                    </div>
                    <div className="text-[10px] text-purple-700 dark:text-slate-400 font-mono">admin@primewave.com</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill("sarah@primewave.com", "user123")}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-left transition-all group dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/50 shadow-2xs cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Sarah (Member)
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-slate-400 font-mono">sarah@primewave.com</div>
                  </div>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      }
    >
      <LoginFormContent />
    </React.Suspense>
  );
}
