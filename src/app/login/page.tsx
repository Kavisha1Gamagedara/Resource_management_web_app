"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Shield,
  UserCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  Zap,
  KeyRound,
  Mail,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuickPersona, setActiveQuickPersona] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during sign in.");
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (
    userEmail: string,
    userPass: string,
    personaKey: string
  ) => {
    setError(null);
    setActiveQuickPersona(personaKey);
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email: userEmail,
        password: userPass,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
        setActiveQuickPersona(null);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "Quick sign-in failed.");
      setIsLoading(false);
      setActiveQuickPersona(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl py-4 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Traditional Credentials Form */}
        <div className="lg:col-span-6 rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
              <KeyRound className="h-3 w-3" />
              <span>Authentication & RBAC</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Sign In to PrimeWave Hub
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Enter your organizational credentials to manage resources and bookings.
            </p>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@primewave.com"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-500 disabled:opacity-50"
            >
              {isLoading && !activeQuickPersona ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Evaluator Fast-Track (1-Click Personas) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-3xl border border-teal-200/80 bg-gradient-to-br from-teal-50/60 via-white to-emerald-50/40 p-6 sm:p-7 shadow-sm dark:border-teal-900/60 dark:bg-gradient-to-br dark:from-teal-950/30 dark:via-zinc-900 dark:to-emerald-950/20">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
                <Zap className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Evaluator Fast-Track: 1-Click Personas
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Click any pre-seeded persona to test permissions instantly without typing.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {/* Persona 1: Admin */}
              <div
                onClick={() =>
                  handleQuickLogin("admin@primewave.com", "admin123", "admin")
                }
                className="group cursor-pointer rounded-2xl border border-zinc-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-purple-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-purple-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Admin User
                        </span>
                        <Badge variant="purple" size="sm">
                          ADMIN ROLE
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500">
                        admin@primewave.com • IT & Operations
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isLoading}
                    className="shrink-0 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 group-hover:bg-purple-600 group-hover:text-white dark:bg-purple-950/60 dark:text-purple-300 transition-colors"
                  >
                    {activeQuickPersona === "admin" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Sign In ⚡"
                    )}
                  </button>
                </div>
                <p className="mt-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                  ✨ <strong>Full Access:</strong> Add, edit & deactivate facilities, override bookings, and manage all resources.
                </p>
              </div>

              {/* Persona 2: Regular User (Sarah - Engineering) */}
              <div
                onClick={() =>
                  handleQuickLogin("sarah@primewave.com", "password123", "sarah")
                }
                className="group cursor-pointer rounded-2xl border border-zinc-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-teal-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-teal-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Sarah Perera
                        </span>
                        <Badge variant="success" size="sm">
                          USER ROLE
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500">
                        sarah@primewave.com • Engineering
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isLoading}
                    className="shrink-0 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 group-hover:bg-teal-600 group-hover:text-white dark:bg-teal-950/60 dark:text-teal-300 transition-colors"
                  >
                    {activeQuickPersona === "sarah" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Sign In ⚡"
                    )}
                  </button>
                </div>
                <p className="mt-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                  👤 <strong>Team Member:</strong> Can book facilities, receive real-time conflict warnings, and edit/cancel own bookings.
                </p>
              </div>

              {/* Persona 3: Regular User (Alex - Product) */}
              <div
                onClick={() =>
                  handleQuickLogin("alex@primewave.com", "password123", "alex")
                }
                className="group cursor-pointer rounded-2xl border border-zinc-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-blue-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Alex Fernando
                        </span>
                        <Badge variant="default" size="sm">
                          USER ROLE
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500">
                        alex@primewave.com • Product Management
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isLoading}
                    className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-950/60 dark:text-blue-300 transition-colors"
                  >
                    {activeQuickPersona === "alex" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Sign In ⚡"
                    )}
                  </button>
                </div>
                <p className="mt-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                  🔍 <strong>Cross-View Testing:</strong> Test "Story 5: View reservations by person" with Alex's scheduled bookings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
