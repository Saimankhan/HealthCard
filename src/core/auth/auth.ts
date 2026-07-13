import "server-only";
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@/core/db/prisma";
import { serverEnv } from "@/core/config/env.server";
import { sendEmail } from "@/core/email/mailer";
import {
  emailVerificationEmail,
  passwordResetEmail,
  welcomeEmail,
} from "@/core/email/templates";
import { authSecondaryStorage } from "@/core/auth/secondary-storage";

function generateHealthCardNumber(): string {
  return `HC-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

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
    requireEmailVerification: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const { subject, html } = passwordResetEmail(url);
      await sendEmail({ to: user.email, subject, html });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const { subject, html } = emailVerificationEmail(url);
      await sendEmail({ to: user.email, subject, html });
    },
    afterEmailVerification: async (user) => {
      const { subject, html } = welcomeEmail(user.name);
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
            await prisma.healthCard.create({
              data: {
                patientId: patient.id,
                cardNumber: generateHealthCardNumber(),
                verificationToken: randomUUID(),
                expiresAt: new Date(
                  new Date().setFullYear(new Date().getFullYear() + 3)
                ),
              },
            });
          }
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
            select: { deletedAt: true },
          });
          if (user?.deletedAt) {
            return false;
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
