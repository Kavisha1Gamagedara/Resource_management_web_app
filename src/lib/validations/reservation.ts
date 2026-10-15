import { z } from "zod";

export const reservationSchema = z
  .object({
    resourceId: z.string().min(1, "Resource ID is required"),
    userId: z.string().optional(), // Admin-only: book on behalf of user
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title cannot exceed 100 characters"),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
    startTime: z.coerce.date({ message: "Invalid start time format" }),
    endTime: z.coerce.date({ message: "Invalid end time format" }),
    isPrivate: z.boolean().default(false),
    autoRelease: z.boolean().default(true).optional(),
  })
  .refine(
    (data) => {
      return data.endTime.getTime() > data.startTime.getTime();
    },
    {
      message: "End time must be later than start time",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => {
      // Must be at least 15 minutes
      const diffMs = data.endTime.getTime() - data.startTime.getTime();
      return diffMs >= 15 * 60 * 1000;
    },
    {
      message: "Reservation duration must be at least 15 minutes",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => {
      // Must not be in the past (allow 2 minute grace period for submission network delay)
      const gracePeriodMs = 2 * 60 * 1000;
      return data.startTime.getTime() >= Date.now() - gracePeriodMs;
    },
    {
      message: "Cannot reserve a resource in the past. Please select an upcoming date and time.",
      path: ["startTime"],
    }
  );

export type ReservationInput = z.infer<typeof reservationSchema>;
