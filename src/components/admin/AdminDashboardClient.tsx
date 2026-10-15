"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  createResource,
  updateResource,
  setResourceStatus,
} from "@/lib/actions/resources";
import {
  ShieldAlert,
  Plus,
  Edit2,
  Power,
  PowerOff,
  CheckCircle,
  Wrench,
  Ban,
  Layers,
  MapPin,
  Users,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { ResourceStatus, Role } from "@prisma/client";

interface AdminDashboardClientProps {
  initialResources: any[];
  categories: any[];
}

export function AdminDashboardClient({
  initialResources,
  categories,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === Role.ADMIN;

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [formName, setFormName] = React.useState("");
  const [formCategoryId, setFormCategoryId] = React.useState(categories[0]?.id || "");
  const [formLocation, setFormLocation] = React.useState("");
  const [formCapacity, setFormCapacity] = React.useState<string>("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formStatus, setFormStatus] = React.useState<ResourceStatus>(ResourceStatus.ACTIVE);
  const [formAttributes, setFormAttributes] = React.useState("");

  const [isSaving, setIsSaving] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const openAddModal = () => {
    setEditingId(null);
    setFormName("");
    setFormCategoryId(categories[0]?.id || "");
    setFormLocation("");
    setFormCapacity("");
    setFormDescription("");
    setFormStatus(ResourceStatus.ACTIVE);
    setFormAttributes(JSON.stringify({ screen: "4K TV", whiteboard: true }, null, 2));
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (res: any) => {
    setEditingId(res.id);
    setFormName(res.name);
    setFormCategoryId(res.categoryId);
    setFormLocation(res.location);
    setFormCapacity(res.capacity ? String(res.capacity) : "");
    setFormDescription(res.description || "");
    setFormStatus(res.status);
    setFormAttributes(
      res.attributes ? JSON.stringify(res.attributes, null, 2) : "{}"
    );
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSaving(true);

    let parsedAttrs = {};
    if (formAttributes.trim()) {
      try {
        parsedAttrs = JSON.parse(formAttributes);
      } catch {
        setFormError("Attributes must be valid JSON format (e.g. {\"screen\": \"4K TV\"})");
        setIsSaving(false);
        return;
      }
    }

    try {
      const payload = {
        name: formName,
        categoryId: formCategoryId,
        location: formLocation,
        capacity: formCapacity ? Number(formCapacity) : null,
        description: formDescription,
        status: formStatus,
        attributes: parsedAttrs,
      };

      if (editingId) {
        await updateResource(editingId, payload);
      } else {
        await createResource(payload);
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setFormError(err.message || "Failed to save resource.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: ResourceStatus) => {
    const nextStatus =
      currentStatus === ResourceStatus.ACTIVE
        ? ResourceStatus.INACTIVE
        : ResourceStatus.ACTIVE;

    try {
      await setResourceStatus(id, nextStatus);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to change resource status.");
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-purple-950/60 border border-purple-800/80 flex items-center justify-center mx-auto text-purple-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Administrator Access Required</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Story 1 requires administrative authorization to add, edit, or deactivate resources.
            You are currently signed in as a regular user ({session?.user?.name || "Member"}).
          </p>
        </div>
        <div className="pt-2">
          <Button
            size="lg"
            className="bg-purple-600 hover:bg-purple-500 border-purple-500/30"
            onClick={() =>
              signIn("credentials", {
                email: "admin@primewave.com",
                password: "admin123",
                callbackUrl: "/admin",
              })
            }
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            ⚡ Switch to Admin Persona
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-purple-400" />
            Admin Resource Management Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Story 1: Add new shared equipment, update capacity/amenities, or deactivate resources.
          </p>
        </div>

        <Button onClick={openAddModal} size="md" className="shrink-0 bg-purple-600 hover:bg-purple-500 border-purple-500/30">
          <Plus className="w-4 h-4 mr-1.5" /> Add New Resource
        </Button>
      </div>

      {/* Resources Table / List */}
      <div className="space-y-3">
        {initialResources.map((res) => {
          const isActive = res.status === ResourceStatus.ACTIVE;

          return (
            <Card
              key={res.id}
              className={`border-slate-800 bg-slate-900/80 p-5 transition-all ${
                !isActive ? "opacity-75 bg-slate-950/80 border-slate-850" : ""
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">
                      {res.name}
                    </span>
                    {res.status === ResourceStatus.ACTIVE && (
                      <Badge variant="success" className="text-[10px]">
                        <CheckCircle className="w-3 h-3 mr-1" /> Active
                      </Badge>
                    )}
                    {res.status === ResourceStatus.MAINTENANCE && (
                      <Badge variant="warning" className="text-[10px]">
                        <Wrench className="w-3 h-3 mr-1" /> Maintenance
                      </Badge>
                    )}
                    {res.status === ResourceStatus.INACTIVE && (
                      <Badge variant="danger" className="text-[10px]">
                        <Ban className="w-3 h-3 mr-1" /> Inactive
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="text-emerald-400 font-medium">
                      {res.category.name}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {res.location}
                    </span>
                    {res.capacity && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          Capacity: {res.capacity}
                        </span>
                      </>
                    )}
                  </div>

                  {res.description && (
                    <p className="text-xs text-slate-400 max-w-2xl line-clamp-1">
                      {res.description}
                    </p>
                  )}
                </div>

                {/* Admin Actions: Edit & Deactivate */}
                <div className="flex items-center gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(res)}
                    className="text-xs h-8"
                  >
                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                  </Button>

                  <Button
                    variant={isActive ? "destructive" : "secondary"}
                    size="sm"
                    onClick={() => handleToggleStatus(res.id, res.status)}
                    className="text-xs h-8"
                    title={
                      isActive
                        ? "Deactivate resource (prevents bookings)"
                        : "Re-activate resource"
                    }
                  >
                    {isActive ? (
                      <>
                        <PowerOff className="w-3 h-3 mr-1" /> Deactivate
                      </>
                    ) : (
                      <>
                        <Power className="w-3 h-3 mr-1" /> Activate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Resource Modal */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? `Edit ${formName}` : "Add New Shared Resource"}
          description="Fill in the resource specifications. Deactivated resources cannot be booked."
          maxWidth="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Resource Name *
              </label>
              <Input
                placeholder="e.g. Conference Room Beta, Drone 4K Kit"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                minLength={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Category *
                </label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Initial Status *
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as ResourceStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={ResourceStatus.ACTIVE}>Active</option>
                  <option value={ResourceStatus.MAINTENANCE}>Maintenance</option>
                  <option value={ResourceStatus.INACTIVE}>Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Physical Location *
                </label>
                <Input
                  placeholder="e.g. Floor 2, Locker A-04"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Capacity (Optional)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 10 (or leave empty)"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Description
              </label>
              <textarea
                className="w-full h-16 rounded-lg border border-slate-700/80 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                placeholder="Brief description of the room or equipment..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Attributes & Specs (JSON)
              </label>
              <textarea
                className="w-full h-20 rounded-lg border border-slate-700/80 bg-slate-950 px-3.5 py-2 text-xs font-mono text-emerald-300 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                placeholder='{"screen": "4K Display", "whiteboard": true}'
                value={formAttributes}
                onChange={(e) => setFormAttributes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving}>
                {editingId ? "Save Changes" : "Create Resource"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
