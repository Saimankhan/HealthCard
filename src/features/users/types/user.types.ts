import type { User } from "@/generated/prisma/client";

export type UserDto = Omit<User, "deletedAt">;
