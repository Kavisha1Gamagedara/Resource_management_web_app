import { z } from "zod";
import { ResourceStatus } from "@prisma/client";

export const resourceSchema = z.object({
  name: z
    .string()
    .min(3, "Resource name must be at least 3 characters")
    .max(100, "Resource name cannot exceed 100 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional().nullable(),
  categoryId: z.string().min(1, "Please select a valid category"),
  location: z.string().min(2, "Location is required (e.g. Floor 2, Storage Locker B)"),
  capacity: z
    .number()
    .int("Capacity must be an integer")
    .positive("Capacity must be at least 1 person")
    .optional()
    .nullable(),
  status: z.nativeEnum(ResourceStatus).default(ResourceStatus.ACTIVE),
  attributes: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type ResourceInput = z.infer<typeof resourceSchema>;
