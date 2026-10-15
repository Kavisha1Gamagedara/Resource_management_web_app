"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { createUserSchema, CreateUserInput } from "@/lib/validations/user";
import { Role } from "@prisma/client";

/**
 * Story: Admin-Only User Creation
 * Allows administrators to provision new corporate user accounts.
 */
export async function createUser(input: CreateUserInput) {
  try {
    // 1. Enforce strict RBAC: Admin privilege check
    await requireAdmin();

    // 2. Validate input fields
    const data = createUserSchema.parse(input);

    // 3. Ensure email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return {
        success: false,
        error: `A user with email "${data.email}" already exists.`,
      };
    }

    // 4. Securely hash password with bcrypt (salt rounds: 10)
    const passwordHash = await bcrypt.hash(data.password, 10);

    // 5. Create user record
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email,
        passwordHash,
        role: data.role || Role.USER,
        department: data.department?.trim() || null,
        avatarUrl: data.avatarUrl?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/reservations");
    revalidatePath("/");

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error("Error creating user:", error);
    return {
      success: false,
      error: error?.message || "Failed to create user.",
    };
  }
}

/**
 * Story: Admin-Only User Retrieval
 * Retrieves all company personnel for admin directory management.
 */
export async function getCompanyUsers() {
  await requireAdmin();

  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      avatarUrl: true,
      createdAt: true,
      _count: {
        select: { reservations: true },
      },
    },
  });
}
