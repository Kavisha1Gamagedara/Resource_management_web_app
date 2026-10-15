"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createResource } from "@/lib/actions/resources";
import { ResourceStatus } from "@prisma/client";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CreateResourceFormProps {
  categories: {
    id: string;
    name: string;
    slug: string;
  }[];
}

export function CreateResourceForm({ categories }: CreateResourceFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ResourceStatus>(ResourceStatus.ACTIVE);
  const [attributes, setAttributes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let parsedAttributes = {};
    if (attributes.trim()) {
      try {
        parsedAttributes = JSON.parse(attributes);
      } catch (e) {
        setError("Invalid JSON format in custom attributes.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await createResource({
        name: name.trim(),
        categoryId,
        location: location.trim(),
        capacity: capacity ? Number(capacity) : null,
        description: description.trim() || undefined,
        status,
        attributes: parsedAttributes,
      });

      setIsSubmitting(false);

      if (res.success) {
        router.push("/admin");
        router.refresh();
      } else {
        setError("Failed to create resource.");
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || "An unexpected error occurred.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Resource Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Conference Room Alpha"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Category *
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Location *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 3rd Floor, West Wing"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Seating Capacity
          </label>
          <input
            type="number"
            min="1"
            placeholder="e.g. 12"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="text-xs">
        <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Description
        </label>
        <textarea
          rows={3}
          placeholder="Detailed equipment list, amenities, room specifications..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Initial Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ResourceStatus)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value={ResourceStatus.ACTIVE}>ACTIVE (Immediately Bookable)</option>
            <option value={ResourceStatus.MAINTENANCE}>MAINTENANCE (Temporarily Offline)</option>
            <option value={ResourceStatus.INACTIVE}>INACTIVE (Deactivated)</option>
          </select>
        </div>

        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Custom Attributes (JSON, optional)
          </label>
          <input
            type="text"
            placeholder='{"hasProjector": true, "whiteboard": true}'
            value={attributes}
            onChange={(e) => setAttributes(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 transition-colors"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Registering...</span>
            </>
          ) : (
            <span>Create Resource</span>
          )}
        </button>
      </div>
    </form>
  );
}
