import React from "react";
import prisma from "@/lib/db";
import { ResourceCatalogClient } from "@/components/resources/ResourceCatalogClient";
import { Building2, Sparkles } from "lucide-react";

export const metadata = {
  title: "Resource Catalog | PrimeWave Lab",
  description: "Browse and filter all available organizational rooms, equipment, labs, and fleet.",
};

export default async function ResourcesPage() {
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
      include: {
        _count: {
          select: { resources: true },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-zinc-200/80 pb-6 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
            <Building2 className="h-5 w-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Resource Catalog & Facilities
          </h1>
        </div>
        <p className="mt-2 text-xs sm:text-sm text-zinc-500 max-w-2xl">
          Explore all shared organization assets. Filter by facility category, location, capacity,
          and availability status.
        </p>
      </div>

      {/* Interactive Catalog Component */}
      <ResourceCatalogClient resources={resources} categories={categories} />
    </div>
  );
}
