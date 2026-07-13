"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/core/auth/auth";

import { clientEnv } from "@/core/config/env.client";

export const authClient = createAuthClient({
  baseURL: clientEnv.NEXT_PUBLIC_APP_URL,
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
