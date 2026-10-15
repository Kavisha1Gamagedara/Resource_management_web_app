import { z } from "zod";
import { ResourceStatus } from "@prisma/client";

export const resourceSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  categoryId: z.string().uuid("Invalid category ID"),
  location: z.string().min(2, "Location must be at least 2 characters").max(100),
  description: z.string().max(500).optional().nullable(),
  capacity: z
    .union([z.number().int().positive("Capacity must be positive"), z.nan()])
    .optional()
    .nullable(),
  status: z.nativeEnum(ResourceStatus).default(ResourceStatus.ACTIVE),
  attributes: z.record(z.string(), z.any()).optional().nullable(),
});

export type ResourceInput = z.infer<typeof resourceSchema>;
