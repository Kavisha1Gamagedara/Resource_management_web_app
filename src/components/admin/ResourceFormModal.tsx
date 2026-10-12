"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Building2,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Tag,
  FileText,
} from "lucide-react";
import { ResourceStatus } from "@prisma/client";
import { createResource, updateResource } from "@/lib/actions/resources";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ResourceToEdit {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  location: string;
  capacity?: number | null;
  status: ResourceStatus;
  attributes?: any;
}

interface ResourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  resourceToEdit?: ResourceToEdit | null;
  onSuccess?: () => void;
}

export function ResourceFormModal({
  isOpen,
  onClose,
  categories,
  resourceToEdit,
  onSuccess,
}: ResourceFormModalProps) {
  const isEditing = Boolean(resourceToEdit);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState<string>("");
  const [status, setStatus] = useState<ResourceStatus>(ResourceStatus.ACTIVE);
  const [description, setDescription] = useState("");
  const [attributesText, setAttributesText] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when opening or changing target
  useEffect(() => {
    if (resourceToEdit) {
      setName(resourceToEdit.name);
      setCategoryId(resourceToEdit.categoryId);
      setLocation(resourceToEdit.location);
      setCapacity(resourceToEdit.capacity ? String(resourceToEdit.capacity) : "");
      setStatus(resourceToEdit.status);
      setDescription(resourceToEdit.description || "");
      if (resourceToEdit.attributes) {
        setAttributesText(
          typeof resourceToEdit.attributes === "object"
            ? Object.entries(resourceToEdit.attributes)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")
            : ""
        );
      } else {
        setAttributesText("");
      }
    } else {
      setName("");
      setCategoryId(categories[0]?.id || "");
      setLocation("");
      setCapacity("");
      setStatus(ResourceStatus.ACTIVE);
      setDescription("");
      setAttributesText("");
    }
    setError(null);
  }, [resourceToEdit, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Parse attributes text into simple key-value or tags object
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

      const payload = {
        name: name.trim(),
        categoryId,
        location: location.trim(),
        capacity: capacity ? parseInt(capacity, 10) : null,
        status,
        description: description.trim() || null,
        attributes: parsedAttributes,
      };

      let result;
      if (isEditing && resourceToEdit) {
        result = await updateResource(resourceToEdit.id, payload);
      } else {
        result = await createResource(payload);
      }

      if (result.success) {
        setIsLoading(false);
        onClose();
        if (onSuccess) onSuccess();
      } else {
        setError(result.error || "An error occurred.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {isEditing ? "Edit Facility / Resource" : "Add New Resource"}
              </h3>
              <p className="text-xs text-zinc-500">
                {isEditing
                  ? "Update configuration, capacity, or status"
                  : "Register a new shared room, gear, lab, or vehicle"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Resource Name */}
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Resource Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Executive Boardroom Alpha, Sony FX3 Rig"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Category *
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-2.5 text-zinc-900 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
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
                Lifecycle Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ResourceStatus)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-2.5 text-zinc-900 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value={ResourceStatus.ACTIVE}>ACTIVE (Bookable)</option>
                <option value={ResourceStatus.MAINTENANCE}>MAINTENANCE (Offline)</option>
                <option value={ResourceStatus.INACTIVE}>INACTIVE (Deactivated)</option>
              </select>
            </div>
          </div>

          {/* Location & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Floor 4 North Wing"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-8 pr-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Capacity (People)
              </label>
              <div className="relative">
                <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="number"
                  min="1"
                  placeholder="Optional (rooms/fleet)"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-8 pr-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Key details, amenities, or notes for members..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* Key Specs / Attributes */}
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Amenities & Specs (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. 4K Screen, Polycom Audio, Whiteboard, USB-C"
              value={attributesText}
              onChange={(e) => setAttributesText(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 font-semibold text-white shadow-sm hover:bg-purple-500 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Create Resource"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
