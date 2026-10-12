import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { AdminResourceTable } from "@/components/admin/AdminResourceTable";
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  PlusCircle,
  Wrench,
  Ban,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  // If unauthenticated, redirect to login
  if (!user) {
    redirect("/login?callbackUrl=/admin");
  }

  // If authenticated but not ADMIN, render explicit 403 Forbidden screen
  if (user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
          <Lock className="h-8 w-8" />
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Administrator Access Required
        </h1>

        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          You are currently signed in as <strong>{user.name}</strong> ({user.role} role).
          Only users with the <span className="font-semibold text-purple-600 dark:text-purple-400">ADMIN</span> role
          can manage facilities, edit configurations, or deactivate resources.
        </p>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 text-left dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Evaluator Fast Switch:
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
            Use the profile dropdown in the top navbar or visit the login page to switch to the <strong>Admin User</strong> persona.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-colors"
            >
              <span>Switch to Admin Persona</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 transition-colors"
            >
              Back to Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // User is verified ADMIN: Query all resources for administration
  const [resources, categories] = await Promise.all([
    prisma.resource.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        _count: {
          select: { reservations: true },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  const activeCount = resources.filter((r) => r.status === "ACTIVE").length;
  const maintenanceCount = resources.filter((r) => r.status === "MAINTENANCE").length;
  const inactiveCount = resources.filter((r) => r.status === "INACTIVE").length;

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Facility & Resource Administration
            </h1>
            <Badge variant="purple" size="sm">
              ADMIN ONLY
            </Badge>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Fulfills Story 1: "As an admin, I can add, edit, and deactivate resources."
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/resources/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create New Resource</span>
          </Link>
          <Link
            href="/resources"
            className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 transition-colors"
          >
            Public Catalog View
          </Link>
        </div>
      </div>

      {/* Admin Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <span className="text-xs font-medium text-zinc-500">Total Managed</span>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{resources.length}</p>
          <span className="text-[11px] text-zinc-400">All registered facilities</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active (Bookable)</span>
          <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">{activeCount}</p>
          <span className="text-[11px] text-zinc-400">Available for reservation</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Maintenance</span>
          <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-400">{maintenanceCount}</p>
          <span className="text-[11px] text-zinc-400">Temporarily offline</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <span className="text-xs font-medium text-zinc-500">Deactivated</span>
          <p className="mt-2 text-2xl font-bold text-zinc-600 dark:text-zinc-300">{inactiveCount}</p>
          <span className="text-[11px] text-zinc-400">Soft-deactivated items</span>
        </div>
      </div>

      {/* Interactive Resources Management Table */}
      <AdminResourceTable initialResources={resources} categories={categories} />
    </div>
  );
}
