import { z } from "zod";
import { paginationQuerySchema } from "@/core/api/pagination";
import { ROLES } from "@/core/auth/roles";

export const listUsersQuerySchema = paginationQuerySchema.extend({
  role: z.enum(ROLES).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  image: z.string().url().nullable().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(ROLES),
});

export const requestAvatarUploadUrlSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(150),
});

export const confirmAvatarSchema = z.object({
  fileKey: z.string().trim().min(1),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type RequestAvatarUploadUrlInput = z.infer<
  typeof requestAvatarUploadUrlSchema
>;
export type ConfirmAvatarInput = z.infer<typeof confirmAvatarSchema>;
