import { Role, ResourceStatus, ReservationStatus } from "@prisma/client";

export type { Role, ResourceStatus, ReservationStatus };

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string | null;
  avatarUrl?: string | null;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count?: {
    resources: number;
  };
}

export interface ResourceSummary {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  category?: CategorySummary;
  location: string;
  capacity?: number | null;
  status: ResourceStatus;
  attributes?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    reservations: number;
  };
}

export interface ReservationSummary {
  id: string;
  title: string;
  notes?: string | null;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  userId: string;
  user?: UserSummary;
  resourceId: string;
  resource?: ResourceSummary;
  createdAt: Date;
  updatedAt: Date;
}
