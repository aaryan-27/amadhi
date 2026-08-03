import { z } from "zod";

const indianPhone = z
  .string()
  .trim()
  .regex(/^(\+?91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

/** Honeypot + minimum-dwell-time anti-spam, shared by all public forms. */
export const antiSpam = {
  website: z.string().max(0, "Spam detected").optional().or(z.literal("")),
  startedAt: z.coerce.number().optional(),
};

export function isTooFast(startedAt?: number) {
  // A human takes more than 2.5s to fill a form.
  return startedAt !== undefined && Date.now() - startedAt < 2500;
}

export const enquirySchema = z.object({
  type: z
    .enum(["enquiry", "visit", "meeting_room", "brochure", "partner", "notify_me", "contact"])
    .default("enquiry"),
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: indianPhone.or(z.literal("")).optional(),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")).optional(),
  message: z.string().trim().max(2000).optional(),
  productType: z.string().max(40).optional(),
  seats: z.string().max(40).optional(),
  budget: z.string().max(60).optional(),
  moveIn: z.string().max(60).optional(),
  citySlug: z.string().max(40).optional(),
  localitySlug: z.string().max(60).optional(),
  listingSlug: z.string().max(120).optional(),
  companyName: z.string().max(120).optional(),
  utm: z.record(z.string(), z.string()).optional(),
  ...antiSpam,
});

export const visitSchema = z.object({
  listingSlug: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  phone: indianPhone,
  email: z.string().trim().email().or(z.literal("")).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.string().min(1).max(40),
  ...antiSpam,
});

export const meetingRoomSchema = z.object({
  listingSlug: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  phone: indianPhone,
  email: z.string().trim().email().or(z.literal("")).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  hours: z.coerce.number().int().min(1).max(12),
  attendees: z.coerce.number().int().min(1).max(200),
  ...antiSpam,
});

export const reviewSchema = z.object({
  listingSlug: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().or(z.literal("")).optional(),
  persona: z.string().max(60).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(20, "Please write at least a couple of sentences").max(2000),
  ...antiSpam,
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
