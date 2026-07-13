import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Verify email - HealthCard",
};

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN: "This verification link is invalid.",
  TOKEN_EXPIRED:
    "This verification link has expired. Please request a new one.",
  USER_NOT_FOUND: "We couldn't find an account for this verification link.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <XCircle className="text-destructive size-10" />
          <h2 className="text-lg font-semibold">Verification failed</h2>
          <p className="text-muted-foreground text-sm">
            {ERROR_MESSAGES[error] ?? "We couldn't verify your email."}
          </p>
          <Button
            className="mt-2"
            render={<Link href="/login">Back to login</Link>}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="text-primary size-10" />
        <h2 className="text-lg font-semibold">Email verified</h2>
        <p className="text-muted-foreground text-sm">
          Your email has been verified. You can now log in to your account.
        </p>
        <Button
          className="mt-2"
          render={<Link href="/login">Go to login</Link>}
        />
      </CardContent>
    </Card>
  );
}
