"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, SlidersHorizontal, Building2, Tag, X } from "lucide-react";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceStatus } from "@/types";

interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: { resources: number };
}

interface ResourceItem {
  id: string;
  name: string;
  description?: string | null;
  location: string;
  capacity?: number | null;
  status: ResourceStatus;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  attributes?: any;
  _count?: {
    reservations: number;
  };
}

interface ResourceCatalogClientProps {
  resources: ResourceItem[];
  categories: Category[];
}

export function ResourceCatalogClient({
  resources,
  categories,
}: ResourceCatalogClientProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [capacityFilter, setCapacityFilter] = useState<string>("ALL");

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      // 1. Search Query
      const query = search.toLowerCase();
      const matchesSearch =
        r.name.toLowerCase().includes(query) ||
        r.location.toLowerCase().includes(query) ||
        (r.description && r.description.toLowerCase().includes(query)) ||
        (r.category && r.category.name.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // 2. Category Filter
      if (selectedCategory !== "ALL" && r.category?.slug !== selectedCategory) {
        return false;
      }

      // 3. Status Filter
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) {
        return false;
      }

      // 4. Capacity Filter
      if (capacityFilter !== "ALL") {
        if (!r.capacity) return false;
        if (capacityFilter === "SMALL" && (r.capacity < 1 || r.capacity > 4)) return false;
        if (capacityFilter === "MEDIUM" && (r.capacity < 5 || r.capacity > 10)) return false;
        if (capacityFilter === "LARGE" && r.capacity <= 10) return false;
      }

      return true;
    });
  }, [resources, search, selectedCategory, selectedStatus, capacityFilter]);

  const hasActiveFilters =
    search !== "" ||
    selectedCategory !== "ALL" ||
    selectedStatus !== "ALL" ||
    capacityFilter !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("ALL");
    setSelectedStatus("ALL");
    setCapacityFilter("ALL");
  };

  return (
    <div className="space-y-6">
      {/* Category Pills Header */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("ALL")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === "ALL"
              ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/80 dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800"
          }`}
        >
          <span>All Facilities & Gear</span>
          <span className="rounded-full bg-zinc-200/60 px-1.5 py-0.2 text-[10px] dark:bg-zinc-800">
            {resources.length}
          </span>
        </button>

        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.slug)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === c.slug
                ? "bg-teal-600 text-white shadow-sm shadow-teal-600/20"
                : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/80 dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800"
            }`}
          >
            <span>{c.name}</span>
            {c._count?.resources !== undefined && (
              <span className="rounded-full bg-zinc-100 px-1.5 py-0.2 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {c._count.resources}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search resources by name, location, or amenities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2 pl-10 pr-4 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-teal-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50/50 py-2 px-3 text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="ALL">Any Status</option>
            <option value="ACTIVE">Available (Active)</option>
            <option value="MAINTENANCE">In Maintenance</option>
            <option value="INACTIVE">Deactivated</option>
          </select>

          {/* Capacity filter */}
          <select
            value={capacityFilter}
            onChange={(e) => setCapacityFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50/50 py-2 px-3 text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="ALL">Any Capacity</option>
            <option value="SMALL">Small (1–4 people)</option>
            <option value="MEDIUM">Medium (5–10 people)</option>
            <option value="LARGE">Large (10+ people)</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          Showing <strong>{filteredResources.length}</strong> of{" "}
          <strong>{resources.length}</strong> resources
        </span>
      </div>

      {/* Grid of Resources */}
      {filteredResources.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-900">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            No resources match your filters
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Try adjusting your search terms, category selection, or capacity criteria.
          </p>
          <button
            onClick={clearFilters}
            className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 dark:bg-zinc-100 dark:text-zinc-900 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}
