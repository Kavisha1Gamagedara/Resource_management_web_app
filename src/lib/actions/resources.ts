"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ResourceStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getResources(params?: {
  categoryId?: string;
  status?: ResourceStatus | "ALL";
  search?: string;
}) {
  const where: any = {};

  if (params?.categoryId && params.categoryId !== "ALL") {
    where.categoryId = params.categoryId;
  }

  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params?.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  return await prisma.resource.findMany({
    where,
    include: {
      category: true,
      reservations: {
        where: {
          status: "CONFIRMED",
          endTime: { gte: new Date() },
        },
        orderBy: { startTime: "asc" },
        take: 3,
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getResourceById(id: string) {
  return await prisma.resource.findUnique({
    where: { id },
    include: {
      category: true,
      reservations: {
        where: {
          status: "CONFIRMED",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { startTime: "asc" },
      },
    },
  });
}

export async function createResource(formData: {
  name: string;
  categoryId: string;
  location: string;
  description?: string;
  capacity?: number | null;
  status?: ResourceStatus;
  attributes?: any;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized: Only administrators can create resources.");
  }

  const resource = await prisma.resource.create({
    data: {
      name: formData.name,
      categoryId: formData.categoryId,
      location: formData.location,
      description: formData.description || null,
      capacity: formData.capacity ? Number(formData.capacity) : null,
      status: formData.status || ResourceStatus.ACTIVE,
      attributes: formData.attributes || {},
    },
  });

  revalidatePath("/resources");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, resource };
}

export async function updateResource(
  id: string,
  formData: {
    name: string;
    categoryId: string;
    location: string;
    description?: string;
    capacity?: number | null;
    status?: ResourceStatus;
    attributes?: any;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized: Only administrators can edit resources.");
  }

  const resource = await prisma.resource.update({
    where: { id },
    data: {
      name: formData.name,
      categoryId: formData.categoryId,
      location: formData.location,
      description: formData.description || null,
      capacity: formData.capacity ? Number(formData.capacity) : null,
      status: formData.status || ResourceStatus.ACTIVE,
      attributes: formData.attributes || {},
    },
  });

  revalidatePath("/resources");
  revalidatePath(`/resources/${id}`);
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, resource };
}

export async function setResourceStatus(id: string, status: ResourceStatus) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized: Only administrators can change resource status.");
  }

  const resource = await prisma.resource.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/resources");
  revalidatePath(`/resources/${id}`);
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, resource };
}
