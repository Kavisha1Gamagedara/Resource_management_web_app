import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { CreateResourceForm } from "@/components/admin/CreateResourceForm";
import { Building2, ArrowLeft, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export const metadata = {
  title: "Create Resource | PrimeWave Admin",
  description: "Register a new shared facility, equipment, lab, or company vehicle.",
};

export default async function NewResourcePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?callbackUrl=/admin/resources/new");
  }

  if (user.role !== "ADMIN") {
    redirect("/admin");
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Admin Panel</span>
        </Link>

        <Badge variant="purple" size="sm">
          ADMIN ACTION
        </Badge>
      </div>

      <div className="border-b border-zinc-200/80 pb-5 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Register New Resource
            </h1>
            <p className="text-xs text-zinc-500">
              Add a meeting room, audio/visual gear, engineering bench, or vehicle to the shared catalog.
            </p>
          </div>
        </div>
      </div>

      {/* Form Component */}
      <CreateResourceForm categories={categories} />
    </div>
  );
}
