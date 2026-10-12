"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Users,
  AlertCircle,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { ResourceStatus } from "@prisma/client";
import { createResource } from "@/lib/actions/resources";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export function CreateResourceForm({ categories }: { categories: Category[] }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState<ResourceStatus>(ResourceStatus.ACTIVE);
  const [description, setDescription] = useState("");
  const [attributesText, setAttributesText] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let parsedAttributes: Record<string, any> | null = null;
      if (attributesText.trim()) {
        const pairs = attributesText.split(",").map((s) => s.trim());
        const attrObj: Record<string, any> = {};
        pairs.forEach((p) => {
          if (p.includes(":")) {
            const [k, v] = p.split(":").map((x) => x.trim());
            if (k) attrObj[k] = v;
          } else if (p) {
            attrObj[p] = true;
          }
        });
        parsedAttributes = attrObj;
      }

      const result = await createResource({
        name: name.trim(),
        categoryId,
        location: location.trim(),
        capacity: capacity ? parseInt(capacity, 10) : null,
        status,
        description: description.trim() || null,
        attributes: parsedAttributes,
      });

      if (result.success) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(result.error || "Failed to create resource.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      {error && (
        <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Resource Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Resource / Facility Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Executive Boardroom Alpha, Sony Cinema FX3 Kit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Category *
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-sm text-zinc-900 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Initial Lifecycle Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ResourceStatus)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-sm text-zinc-900 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value={ResourceStatus.ACTIVE}>ACTIVE (Available for booking)</option>
              <option value={ResourceStatus.MAINTENANCE}>MAINTENANCE (Temporarily offline)</option>
              <option value={ResourceStatus.INACTIVE}>INACTIVE (Deactivated)</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Physical Location *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                required
                placeholder="e.g. Floor 3, East Wing, Locker 102"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Capacity (People)
            </label>
            <div className="relative">
              <Users className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
              <input
                type="number"
                min="1"
                placeholder="Optional (e.g. 10 for rooms, 5 for cars)"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description & Notes for Staff
            </label>
            <textarea
              rows={3}
              placeholder="Key specifications, equipment inclusions, or booking guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* Amenities & Attributes */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Amenities & Specifications (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. 4K Screen, Polycom Audio, Dual Monitors, Whiteboard"
              value={attributesText}
              onChange={(e) => setAttributesText(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Link
            href="/admin"
            className="rounded-xl border border-zinc-200 px-5 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Resource...</span>
              </>
            ) : (
              <span>Create Resource Now ⚡</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
