import { z } from "zod";

export const reservationSchema = z
  .object({
    resourceId: z.string().min(1, "Resource ID is required"),
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title cannot exceed 100 characters"),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
    startTime: z.coerce.date({ message: "Invalid start time format" }),
    endTime: z.coerce.date({ message: "Invalid end time format" }),
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
  );

export type ReservationInput = z.infer<typeof reservationSchema>;
