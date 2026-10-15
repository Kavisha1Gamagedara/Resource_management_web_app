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
  const [requireBuffer, setRequireBuffer] = useState(false);
  const [bufferMinutes, setBufferMinutes] = useState(15);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let parsedAttributes: any = {};
    if (attributes.trim()) {
      try {
        parsedAttributes = JSON.parse(attributes);
      } catch (e) {
        setError("Invalid JSON format in custom attributes.");
        return;
      }
    }

    if (requireBuffer) {
      parsedAttributes.bufferMinutes = Number(bufferMinutes) || 15;
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
            placeholder='{"screen": "4K TV", "whiteboard": true}'
            value={attributes}
            onChange={(e) => setAttributes(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Turnaround Buffer Setting */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-800/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="text-lg">🧹</span>
            <div>
              <label
                htmlFor="crf-turnaround-toggle"
                className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block cursor-pointer"
              >
                Require Turnaround Buffer (Cleaning & Reset)
              </label>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-relaxed">
                Enforce mandatory gap between consecutive bookings for cleaning, room reset, or recharge.
              </span>
            </div>
          </div>
          <input
            id="crf-turnaround-toggle"
            type="checkbox"
            checked={requireBuffer}
            onChange={(e) => setRequireBuffer(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500 cursor-pointer mt-0.5"
          />
        </div>

        {requireBuffer && (
          <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
              Turnaround Duration:
            </span>
            <select
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
              className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value={10}>10 minutes (Quick Wipe & Air)</option>
              <option value={15}>15 minutes (Standard Room Reset / Sanitization)</option>
              <option value={30}>30 minutes (Deep Sanitization / Vehicle Check)</option>
              <option value={45}>45 minutes (A/V Gear Re-configuration)</option>
              <option value={60}>60 minutes (Heavy Cleaning / EV Fleet Recharge)</option>
            </select>
          </div>
        )}
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
