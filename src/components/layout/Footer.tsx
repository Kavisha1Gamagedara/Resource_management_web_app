import React from "react";
import Link from "next/link";
import { Shield, Sparkles, CheckCircle2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/70 py-8 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold text-zinc-900 dark:text-zinc-200">
              PrimeWave Lab (Pvt) Ltd
            </span>
            <span>•</span>
            <span>Technical Assessment Submission</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>Full-Stack Next.js (App Router) + PostgreSQL</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-2">
          <p>© {new Date().getFullYear()} PrimeWave Lab Resource Reservation System. Built with clean architecture & ACID transaction safety.</p>
          <div className="flex items-center gap-3">
            <span>Next Step: Auth & RBAC Implementation</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
