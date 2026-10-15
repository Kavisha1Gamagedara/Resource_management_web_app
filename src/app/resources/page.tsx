import * as React from "react";
import { getResources, getCategories } from "@/lib/actions/resources";
import { ResourceCatalogClient } from "@/components/resources/ResourceCatalogClient";
import { Loader2 } from "lucide-react";

export default async function ResourcesPage() {
  const [resources, categories] = await Promise.all([
    getResources(),
    getCategories(),
  ]);

  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      }
    >
      <ResourceCatalogClient initialResources={resources} categories={categories} />
    </React.Suspense>
  );
}
