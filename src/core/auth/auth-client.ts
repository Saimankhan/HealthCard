"use client";

import { createAuthClient } from "better-auth/react";

import { clientEnv } from "@/core/config/env.client";

export const authClient = createAuthClient({
  baseURL: clientEnv.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signOut, signUp, useSession } = authClient;
