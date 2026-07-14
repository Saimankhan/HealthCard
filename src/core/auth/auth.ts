import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@/core/db/prisma";
import { serverEnv } from "@/core/config/env.server";
import { sendEmail } from "@/core/email/mailer";
import { passwordResetEmail, welcomeEmail } from "@/core/email/templates";
import { authSecondaryStorage } from "@/core/auth/secondary-storage";
import { createHealthCard } from "@/features/healthcard/repository/health-card.repository";
import { createAuditLog } from "@/features/audit-logs/repository/audit-log.repository";

export const auth = betterAuth({
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL: serverEnv.BETTER_AUTH_URL,
  trustedOrigins: [serverEnv.BETTER_AUTH_URL],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secondaryStorage: authSecondaryStorage,
  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
    window: 60,
    max: 60,
  },
  emailAndPassword: {
    enabled: true,
    // Local-demo-only project: skip the verification-email round trip and
    // sign users in immediately after registration.
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const { subject, html } = passwordResetEmail(url);
      await sendEmail({ to: user.email, subject, html });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "PATIENT",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (user.role === "PATIENT") {
            const patient = await prisma.patient.create({
              data: { userId: user.id },
            });
            await createHealthCard(patient.id);
          }
          const { subject, html } = welcomeEmail(user.name);
          await sendEmail({ to: user.email, subject, html });
        },
      },
    },
    session: {
      create: {
        // Soft-deleted / deactivated accounts are invisible to Better Auth's
        // own schema (it only knows the standard User columns), so we block
        // new sessions for them here rather than relying on app-layer checks.
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { deletedAt: true, suspendedAt: true },
          });
          if (user?.deletedAt || user?.suspendedAt) {
            return false;
          }
        },
        after: async (session) => {
          await createAuditLog({
            actorId: session.userId,
            action: "LOGIN",
            entityType: "User",
            entityId: session.userId,
          });
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
