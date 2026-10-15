import { z } from "zod";
import { Role } from "@prisma/client";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please provide a valid corporate email address").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.nativeEnum(Role).default(Role.USER),
  department: z.string().max(100).optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
