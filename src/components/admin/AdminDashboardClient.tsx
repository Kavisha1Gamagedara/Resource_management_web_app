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
import { createUser } from "@/lib/actions/users";
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
  UserPlus,
  Mail,
  KeyRound,
  Briefcase,
  Search,
  CheckCircle2,
  RefreshCw,
  CalendarDays,
  Clock,
  Building2,
  XCircle,
} from "lucide-react";
import { ResourceStatus, Role } from "@prisma/client";
import { AdminCreateReservationModal } from "./AdminCreateReservationModal";
import { cancelReservation } from "@/lib/actions/reservations";
import { formatDate, formatTime } from "@/lib/utils";

interface AdminDashboardClientProps {
  initialResources: any[];
  categories: any[];
  initialUsers?: any[];
  initialReservations?: any[];
}

export function AdminDashboardClient({
  initialResources,
  categories,
  initialUsers = [],
  initialReservations = [],
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
  const [requireBuffer, setRequireBuffer] = React.useState(false);
  const [bufferMinutes, setBufferMinutes] = React.useState(15);

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
    setRequireBuffer(false);
    setBufferMinutes(15);
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
    const attrs = res.attributes || {};
    setRequireBuffer(Boolean(attrs.bufferMinutes && Number(attrs.bufferMinutes) > 0));
    setBufferMinutes(attrs.bufferMinutes ? Number(attrs.bufferMinutes) : 15);
    setFormAttributes(
      res.attributes ? JSON.stringify(res.attributes, null, 2) : "{}"
    );
    setFormError("");
    setIsModalOpen(true);
  };

  // Navigation Tabs & Reservation Management State (ADMIN ONLY)
  const [activeTab, setActiveTab] = React.useState<"resources" | "users" | "reservations">("resources");
  const [isAdminReservationModalOpen, setIsAdminReservationModalOpen] = React.useState(false);
  const [reservationSearch, setReservationSearch] = React.useState("");
  const [reservationStatusFilter, setReservationStatusFilter] = React.useState<"ALL" | "CONFIRMED" | "CANCELLED">("ALL");
  const [reservationDeptFilter, setReservationDeptFilter] = React.useState<string>("ALL");

  // Distinct departments across all reservations
  const allDepartments = React.useMemo(() => {
    const set = new Set<string>();
    (initialReservations || []).forEach((r: any) => {
      if (r.user?.department) set.add(r.user.department);
    });
    (initialUsers || []).forEach((u: any) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set).sort();
  }, [initialReservations, initialUsers]);

  // Filtered reservations for admin view
  const filteredReservations = React.useMemo(() => {
    return (initialReservations || []).filter((r: any) => {
      if (reservationStatusFilter !== "ALL" && r.status !== reservationStatusFilter) {
        return false;
      }
      if (reservationDeptFilter !== "ALL" && r.user?.department !== reservationDeptFilter) {
        return false;
      }
      if (!reservationSearch.trim()) return true;

      const q = reservationSearch.toLowerCase();
      const titleMatch = r.title?.toLowerCase().includes(q);
      const userNameMatch = r.user?.name?.toLowerCase().includes(q);
      const userEmailMatch = r.user?.email?.toLowerCase().includes(q);
      const resourceNameMatch = r.resource?.name?.toLowerCase().includes(q);
      const locationMatch = r.resource?.location?.toLowerCase().includes(q);
      const deptMatch = r.user?.department?.toLowerCase().includes(q);

      return titleMatch || userNameMatch || userEmailMatch || resourceNameMatch || locationMatch || deptMatch;
    });
  }, [initialReservations, reservationStatusFilter, reservationDeptFilter, reservationSearch]);

  const [isUserModalOpen, setIsUserModalOpen] = React.useState(false);
  const [userSearch, setUserSearch] = React.useState("");
  const [userRoleFilter, setUserRoleFilter] = React.useState<"ALL" | "ADMIN" | "USER">("ALL");

  const [userName, setUserName] = React.useState("");
  const [userEmail, setUserEmail] = React.useState("");
  const [userPassword, setUserPassword] = React.useState("");
  const [userRole, setUserRole] = React.useState<Role>(Role.USER);
  const [userDepartment, setUserDepartment] = React.useState("Engineering");
  const [customDepartment, setCustomDepartment] = React.useState("");
  const [userAvatarUrl, setUserAvatarUrl] = React.useState("");
  const [isUserSaving, setIsUserSaving] = React.useState(false);
  const [userError, setUserError] = React.useState("");
  const [userSuccess, setUserSuccess] = React.useState("");

  const openAddUserModal = () => {
    setUserName("");
    setUserEmail("");
    setUserPassword("prime" + Math.floor(1000 + Math.random() * 9000));
    setUserRole(Role.USER);
    setUserDepartment("Engineering");
    setCustomDepartment("");
    setUserAvatarUrl("");
    setUserError("");
    setUserSuccess("");
    setIsUserModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError("");
    setUserSuccess("");
    setIsUserSaving(true);

    const finalDepartment =
      userDepartment === "OTHER"
        ? customDepartment.trim()
        : userDepartment.trim();

    if (userDepartment === "OTHER" && !finalDepartment) {
      setUserError("Please specify the custom department name.");
      setIsUserSaving(false);
      return;
    }

    try {
      const res = await createUser({
        name: userName.trim(),
        email: userEmail.trim().toLowerCase(),
        password: userPassword,
        role: userRole,
        department: finalDepartment || undefined,
        avatarUrl: userAvatarUrl.trim() || undefined,
      });

      if (!res.success) {
        setUserError(res.error || "Failed to create user.");
      } else {
        setUserSuccess(`User account for "${userName}" created successfully!`);
        setTimeout(() => {
          setIsUserModalOpen(false);
          router.refresh();
        }, 1000);
      }
    } catch (err: any) {
      setUserError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsUserSaving(false);
    }
  };

  const filteredUsers = React.useMemo(() => {
    return (initialUsers || []).filter((u: any) => {
      const q = userSearch.toLowerCase();
      const matchesSearch =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q));
      const matchesRole =
        userRoleFilter === "ALL" || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [initialUsers, userSearch, userRoleFilter]);

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

    if (requireBuffer) {
      (parsedAttrs as any).bufferMinutes = Number(bufferMinutes) || 15;
    } else {
      delete (parsedAttrs as any).bufferMinutes;
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
            Admin Operations & Management Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Provision company personnel accounts, manage shared facilities, and configure turnaround buffer intervals.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeTab === "resources" ? (
            <Button onClick={openAddModal} size="md" className="shrink-0 bg-purple-600 hover:bg-purple-500 border-purple-500/30">
              <Plus className="w-4 h-4 mr-1.5" /> Add New Resource
            </Button>
          ) : activeTab === "users" ? (
            <Button onClick={openAddUserModal} size="md" className="shrink-0 bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30">
              <UserPlus className="w-4 h-4 mr-1.5" /> Provision New User
            </Button>
          ) : (
            <Button onClick={() => setIsAdminReservationModalOpen(true)} size="md" className="shrink-0 bg-purple-600 hover:bg-purple-500 border-purple-500/30">
              <UserPlus className="w-4 h-4 mr-1.5" /> + Book for User
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("resources")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "resources"
              ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Shared Facilities & Gear</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {initialResources.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "users"
              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Company Personnel & RBAC</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono">
            {initialUsers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reservations")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "reservations"
              ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>All User Reservations</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-800 text-purple-300 font-mono">
            {initialReservations.length}
          </span>
        </button>
      </div>

      {/* Resources Table / List */}
      {activeTab === "resources" && (
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
                    {Number((res.attributes as any)?.bufferMinutes) > 0 && (
                      <Badge variant="teal" className="text-[10px] gap-1">
                        <span>🧹</span> {(res.attributes as any).bufferMinutes}m Turnaround Buffer
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
      )}

      {/* Users / Personnel Directory Tab */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <Card className="border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search personnel by name, email, or department..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">All Roles ({(initialUsers || []).length})</option>
                  <option value="ADMIN">Administrators Only</option>
                  <option value="USER">Standard Members Only</option>
                </select>

                <Button
                  onClick={openAddUserModal}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30 text-xs shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" /> New User
                </Button>
              </div>
            </div>
          </Card>

          {/* Personnel Table / Card List */}
          <div className="space-y-2.5">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/30 space-y-3">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">No personnel found matching your filter criteria.</p>
                {userSearch && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUserSearch("")}
                    className="text-xs"
                  >
                    Clear Search Filter
                  </Button>
                )}
              </div>
            ) : (
              filteredUsers.map((u: any) => {
                const isAdminUser = u.role === Role.ADMIN;
                const initials = u.name
                  ? u.name
                      .split(" ")
                      .map((p: string) => p[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "U";

                return (
                  <Card
                    key={u.id}
                    className="border-slate-800 bg-slate-900/80 p-4 hover:border-slate-700/80 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
                            isAdminUser
                              ? "bg-purple-950/80 border-purple-700 text-purple-300"
                              : "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                          }`}
                        >
                          {initials}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {u.name}
                            </span>
                            {isAdminUser ? (
                              <Badge variant="purple" size="sm" className="gap-1 font-semibold">
                                <ShieldCheck className="w-3 h-3 text-purple-400" /> Admin
                              </Badge>
                            ) : (
                              <Badge variant="teal" size="sm" className="gap-1 font-medium">
                                <Users className="w-3 h-3 text-teal-400" /> Team Member
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1 text-slate-300">
                              <Mail className="w-3 h-3 text-slate-500" />
                              {u.email}
                            </span>
                            {u.department && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Briefcase className="w-3 h-3 text-slate-500" />
                                  {u.department}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span className="text-slate-500">
                              Joined {new Date(u.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center text-xs text-slate-400">
                        <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                          {u._count?.reservations || 0} reservations
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Company Reservations Tab (ADMIN ONLY) */}
      {activeTab === "reservations" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <div className="inline-flex rounded-xl bg-slate-900/80 border border-slate-800 p-1">
                {(["ALL", "CONFIRMED", "CANCELLED"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setReservationStatusFilter(st)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      reservationStatusFilter === st
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {st === "ALL" ? "All Bookings" : st === "CONFIRMED" ? "Confirmed" : "Cancelled"}
                  </button>
                ))}
              </div>

              {/* Department Filter */}
              <select
                value={reservationDeptFilter}
                onChange={(e) => setReservationDeptFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-purple-500"
              >
                <option value="ALL">All Departments</option>
                {allDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search employee, facility, title..."
                value={reservationSearch}
                onChange={(e) => setReservationSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>

          {/* Reservations List */}
          <div className="space-y-3">
            {filteredReservations.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/30 space-y-3">
                <CalendarDays className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">No company reservations found matching filter criteria.</p>
                <Button
                  onClick={() => setIsAdminReservationModalOpen(true)}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" /> Book on Behalf of User
                </Button>
              </div>
            ) : (
              filteredReservations.map((res: any) => {
                const isCancelled = res.status === "CANCELLED";
                const isPast = new Date(res.endTime).getTime() <= Date.now();
                return (
                  <Card
                    key={res.id}
                    className="border-slate-800 bg-slate-900/80 p-4 hover:border-slate-700/80 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-white">
                            {res.title}
                          </span>
                          <Badge
                            variant={isCancelled ? "danger" : isPast ? "neutral" : "success"}
                            size="sm"
                          >
                            {isCancelled ? "CANCELLED" : isPast ? "PAST / CONCLUDED" : res.status}
                          </Badge>
                          {res.notes?.includes("[BOOKED_BY_ADMIN") && (
                            <Badge variant="purple" size="sm">
                              👑 Booked by Admin
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5 text-purple-300 font-medium">
                            <Users className="w-3.5 h-3.5 text-purple-400" />
                            <span>{res.user?.name} ({res.user?.department || "General"})</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-teal-300 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-teal-400" />
                            <span>{res.resource?.name} ({res.resource?.location})</span>
                          </span>
                          <span className="flex items-center gap-1.5 font-mono text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {formatDate(res.startTime)} • {formatTime(res.startTime)} – {formatTime(res.endTime)}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        {!isCancelled && !isPast && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-xs"
                            onClick={async () => {
                              if (window.confirm(`Cancel reservation for "${res.title}" booked by ${res.user?.name}?`)) {
                                await cancelReservation(res.id);
                                router.refresh();
                              }
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                          </Button>
                        )}
                        {isPast && !isCancelled && (
                          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Past
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

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

            {/* Turnaround Buffer Setting */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-lg">🧹</span>
                  <div>
                    <label
                      htmlFor="turnaround-toggle"
                      className="text-xs font-semibold text-slate-200 block cursor-pointer"
                    >
                      Require Turnaround Buffer (Cleaning & Reset)
                    </label>
                    <span className="text-[11px] text-slate-400 block leading-relaxed">
                      Enforce automated interval buffer between consecutive bookings for cleaning, inspection, or recharge.
                    </span>
                  </div>
                </div>
                <input
                  id="turnaround-toggle"
                  type="checkbox"
                  checked={requireBuffer}
                  onChange={(e) => setRequireBuffer(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-teal-600 focus:ring-teal-500 cursor-pointer mt-0.5"
                />
              </div>

              {requireBuffer && (
                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-300 font-medium">
                    Buffer Duration:
                  </span>
                  <select
                    value={bufferMinutes}
                    onChange={(e) => setBufferMinutes(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
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

      {/* Admin Provision New User Modal */}
      {isUserModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsUserModalOpen(false)}
          title="Provision New Company Personnel"
          description="Create a verified company user account with initial credentials and assign Role-Based Access Control (RBAC)."
          maxWidth="md"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            {userError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{userError}</span>
              </div>
            )}

            {userSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{userSuccess}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Full Name *
              </label>
              <Input
                placeholder="e.g. Maya Lin"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                minLength={2}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Corporate Email Address *
              </label>
              <Input
                type="email"
                placeholder="e.g. maya.lin@primewave.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Role / Permissions (RBAC) *
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as Role)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={Role.USER}>Standard Team Member</option>
                  <option value={Role.ADMIN}>System Administrator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Department
                </label>
                <select
                  value={userDepartment}
                  onChange={(e) => {
                    setUserDepartment(e.target.value);
                    if (e.target.value !== "OTHER") {
                      setCustomDepartment("");
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product & Design">Product & Design</option>
                  <option value="Operations & Facilities">Operations & Facilities</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="Executive / HR">Executive / HR</option>
                  <option value="Finance">Finance</option>
                  <option value="OTHER">Other (Specify Custom)...</option>
                </select>
              </div>
            </div>

            {userDepartment === "OTHER" && (
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-950/70 border border-emerald-500/40">
                <label className="text-xs font-semibold text-emerald-400 flex items-center justify-between">
                  <span>Custom Department Name *</span>
                  <span className="text-[10px] text-slate-400 font-normal">e.g. Legal, QA Testing, Customer Success</span>
                </label>
                <Input
                  type="text"
                  placeholder="Enter custom department name..."
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  required={userDepartment === "OTHER"}
                  autoFocus
                />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Temporary Access Password *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setUserPassword("prime" + Math.floor(1000 + Math.random() * 9000))
                  }
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Auto-Generate
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type="text"
                  placeholder="At least 6 characters"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-9 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Encrypted via bcrypt with 10 salt rounds. Provide this password to the employee for first login.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsUserModalOpen(false)}
                disabled={isUserSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isUserSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <UserPlus className="w-4 h-4 mr-1.5" /> Provision User
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Admin Book on Behalf of User Modal */}
      {isAdminReservationModalOpen && (
        <AdminCreateReservationModal
          isOpen={isAdminReservationModalOpen}
          onClose={() => setIsAdminReservationModalOpen(false)}
          onSuccess={() => {
            setIsAdminReservationModalOpen(false);
            router.refresh();
          }}
          users={initialUsers}
          resources={initialResources}
        />
      )}
    </div>
  );
}
