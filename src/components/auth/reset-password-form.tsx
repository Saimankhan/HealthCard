"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Must be at least 8 characters"),
});

export function ResetPasswordForm({
  token,
  error,
}: {
  token?: string;
  error?: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "" },
  });

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: values.newPassword }),
      });
      toast.success("Password reset. Please log in with your new password.");
      router.push("/login");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to reset password."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (error || !token) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <h2 className="text-lg font-semibold">Link expired or invalid</h2>
          <p className="text-muted-foreground text-sm">
            This password reset link is no longer valid. Request a new one.
          </p>
          <Button
            className="mt-2"
            render={<Link href="/forgot-password">Request new link</Link>}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Choose a new password for your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
