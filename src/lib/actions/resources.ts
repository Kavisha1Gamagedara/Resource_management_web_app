"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { resourceSchema, ResourceInput } from "@/lib/validations/resource";
import { ResourceStatus } from "@prisma/client";

export async function createResource(input: ResourceInput) {
  try {
    await requireAdmin();

    const validatedData = resourceSchema.parse(input);

    const resource = await prisma.resource.create({
      data: {
        name: validatedData.name.trim(),
        description: validatedData.description?.trim() || null,
        categoryId: validatedData.categoryId,
        location: validatedData.location.trim(),
        capacity: validatedData.capacity || null,
        status: validatedData.status,
        attributes: (validatedData.attributes as any) || null,
      },
      include: {
        category: true,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/resources");
    revalidatePath("/");

    return { success: true, resource };
  } catch (error: any) {
    console.error("Failed to create resource:", error);
    return {
      success: false,
      error: error?.message || "Failed to create resource.",
    };
  }
}

export async function updateResource(id: string, input: ResourceInput) {
  try {
    await requireAdmin();

    if (!id) throw new Error("Resource ID is required for update.");

    const validatedData = resourceSchema.parse(input);

    const resource = await prisma.resource.update({
      where: { id },
      data: {
        name: validatedData.name.trim(),
        description: validatedData.description?.trim() || null,
        categoryId: validatedData.categoryId,
        location: validatedData.location.trim(),
        capacity: validatedData.capacity || null,
        status: validatedData.status,
        attributes: (validatedData.attributes as any) || null,
      },
      include: {
        category: true,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/resources");
    revalidatePath(`/resources/${id}`);
    revalidatePath("/");

    return { success: true, resource };
  } catch (error: any) {
    console.error("Failed to update resource:", error);
    return {
      success: false,
      error: error?.message || "Failed to update resource.",
    };
  }
}

/**
 * Story 1: Soft-deactivate or change status of a resource
 * Setting to INACTIVE preserves historical audit reservations while preventing new bookings.
 */
export async function setResourceStatus(id: string, status: ResourceStatus) {
  try {
    await requireAdmin();

    if (!id) throw new Error("Resource ID is required.");

    const resource = await prisma.resource.update({
      where: { id },
      data: { status },
      include: {
        category: true,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/resources");
    revalidatePath(`/resources/${id}`);
    revalidatePath("/");

    return { success: true, resource };
  } catch (error: any) {
    console.error("Failed to update resource status:", error);
    return {
      success: false,
      error: error?.message || "Failed to change resource status.",
    };
  }
}

/**
 * Delete a resource or soft-deactivate if reservations exist
 */
export async function deleteResource(id: string) {
  try {
    await requireAdmin();

    if (!id) throw new Error("Resource ID is required.");

    // Check if any reservations exist for this resource
    const reservationCount = await prisma.reservation.count({
      where: { resourceId: id },
    });

    if (reservationCount > 0) {
      // Soft-deactivate to prevent breaking reservation integrity
      await prisma.resource.update({
        where: { id },
        data: { status: ResourceStatus.INACTIVE },
      });

      revalidatePath("/admin");
      revalidatePath("/resources");
      revalidatePath("/");

      return {
        success: true,
        softDeactivated: true,
        message:
          "Resource has active/historical reservations. It was safely deactivated (INACTIVE) to preserve records.",
      };
    }

    // No reservations: Safe to permanently delete
    await prisma.resource.delete({
      where: { id },
    });

    revalidatePath("/admin");
    revalidatePath("/resources");
    revalidatePath("/");

    return { success: true, softDeactivated: false };
  } catch (error: any) {
    console.error("Failed to delete resource:", error);
    return {
      success: false,
      error: error?.message || "Failed to delete resource.",
    };
  }
}
