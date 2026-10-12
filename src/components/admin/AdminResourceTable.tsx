"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Edit3,
  Power,
  Trash2,
  PlusCircle,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Ban,
  Loader2,
  Tag,
  MapPin,
  Users,
} from "lucide-react";
import { ResourceStatus } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { ResourceFormModal } from "./ResourceFormModal";
import { setResourceStatus, deleteResource } from "@/lib/actions/resources";

interface ResourceItem {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  location: string;
  capacity?: number | null;
  status: ResourceStatus;
  attributes?: any;
  _count: {
    reservations: number;
  };
}

interface AdminResourceTableProps {
  initialResources: ResourceItem[];
  categories: { id: string; name: string; slug: string }[];
}

export function AdminResourceTable({
  initialResources,
  categories,
}: AdminResourceTableProps) {
  const router = useRouter();
  const [resources, setResources] = useState<ResourceItem[]>(initialResources);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState<ResourceItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Sync state if initialResources changes
  React.useEffect(() => {
    setResources(initialResources);
  }, [initialResources]);

  // Filter resources
  const filteredResources = resources.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.location.toLowerCase().includes(search.toLowerCase()) ||
      r.category.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ? true : r.status === statusFilter;

    const matchesCategory =
      selectedCategory === "ALL" ? true : r.categoryId === selectedCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenAdd = () => {
    setResourceToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (res: ResourceItem) => {
    setResourceToEdit(res);
    setModalOpen(true);
  };

  // Story 1: Soft-Deactivate or Re-Activate a Resource
  const handleToggleStatus = async (resource: ResourceItem) => {
    setActionLoadingId(resource.id);
    const newStatus: ResourceStatus =
      resource.status === ResourceStatus.ACTIVE
        ? ResourceStatus.INACTIVE
        : ResourceStatus.ACTIVE;

    const result = await setResourceStatus(resource.id, newStatus);
    setActionLoadingId(null);

    if (result.success && result.resource) {
      setResources((prev) =>
        prev.map((item) =>
          item.id === resource.id
            ? { ...item, status: result.resource!.status }
            : item
        )
      );
      showNotification(
        "success",
        `"${resource.name}" is now ${
          newStatus === "ACTIVE" ? "ACTIVE (Bookable)" : "INACTIVE (Deactivated)"
        }.`
      );
    } else {
      showNotification("error", result.error || "Failed to update status.");
    }
  };

  // Safe Delete / Deactivation
  const handleDelete = async (resource: ResourceItem) => {
    if (
      !confirm(
        `Are you sure you want to delete or deactivate "${resource.name}"?`
      )
    ) {
      return;
    }

    setActionLoadingId(resource.id);
    const result = await deleteResource(resource.id);
    setActionLoadingId(null);

    if (result.success) {
      if (result.softDeactivated) {
        setResources((prev) =>
          prev.map((item) =>
            item.id === resource.id
              ? { ...item, status: ResourceStatus.INACTIVE }
              : item
          )
        );
        showNotification(
          "success",
          result.message || "Resource deactivated to protect historical bookings."
        );
      } else {
        setResources((prev) => prev.filter((item) => item.id !== resource.id));
        showNotification("success", `"${resource.name}" was permanently removed.`);
      }
    } else {
      showNotification("error", result.error || "Failed to delete.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center gap-2 rounded-2xl border p-3.5 text-xs shadow-md transition-all ${
            notification.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/80 dark:text-rose-300"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Filter Bar & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50/50 py-2 px-3 text-xs text-zinc-900 focus:border-purple-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active (Bookable)</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="INACTIVE">Inactive (Deactivated)</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50/50 py-2 px-3 text-xs text-zinc-900 focus:border-purple-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Add Resource Button */}
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 transition-all shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Resource</span>
        </button>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white overflow-hidden shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 font-medium">
              <tr>
                <th className="py-3 px-4">Facility / Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Bookings</th>
                <th className="py-3 px-4 text-right">Admin Actions (Story 1)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-500">
                    No resources match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredResources.map((resource) => (
                  <tr
                    key={resource.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                        {resource.name}
                      </span>
                      {resource.description && (
                        <p className="text-[11px] text-zinc-500 line-clamp-1 max-w-xs">
                          {resource.description}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">
                      {resource.category.name}
                    </td>

                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">
                      {resource.location}
                    </td>

                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">
                      {resource.capacity ? `${resource.capacity} people` : "—"}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          resource.status === "ACTIVE"
                            ? "success"
                            : resource.status === "MAINTENANCE"
                            ? "warning"
                            : "neutral"
                        }
                        size="sm"
                      >
                        {resource.status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">
                      {resource._count.reservations} total
                    </td>

                    {/* Admin Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(resource)}
                          className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                          title="Edit Resource"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        {/* Deactivate / Activate Toggle (Story 1) */}
                        <button
                          onClick={() => handleToggleStatus(resource)}
                          disabled={actionLoadingId === resource.id}
                          className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                            resource.status === "ACTIVE"
                              ? "bg-zinc-100 text-zinc-700 hover:bg-rose-50 hover:text-rose-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-rose-950/60 dark:hover:text-rose-300"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                          title={
                            resource.status === "ACTIVE"
                              ? "Click to Deactivate resource"
                              : "Click to Re-activate resource"
                          }
                        >
                          {actionLoadingId === resource.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Power className="h-3 w-3" />
                          )}
                          <span>
                            {resource.status === "ACTIVE"
                              ? "Deactivate"
                              : "Activate"}
                          </span>
                        </button>

                        {/* Delete Action */}
                        <button
                          onClick={() => handleDelete(resource)}
                          disabled={actionLoadingId === resource.id}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors"
                          title="Delete / Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <ResourceFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
        resourceToEdit={resourceToEdit}
        onSuccess={(savedResource) => {
          if (savedResource) {
            const formatted: ResourceItem = {
              ...savedResource,
              _count: savedResource._count || { reservations: 0 },
            };
            if (resourceToEdit) {
              setResources((prev) =>
                prev.map((r) => (r.id === formatted.id ? formatted : r))
              );
              showNotification(
                "success",
                `"${formatted.name}" updated successfully!`
              );
            } else {
              setResources((prev) => [formatted, ...prev]);
              showNotification(
                "success",
                `"${formatted.name}" created successfully and added to catalog!`
              );
            }
          }
          router.refresh();
        }}
      />
    </div>
  );
}
