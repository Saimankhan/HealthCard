"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";

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

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setIsSubmitting(true);
    try {
      await apiFetch("/api/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });
      setSubmitted(true);
    } catch {
      // Better Auth intentionally reports success even for unknown emails
      // (email enumeration protection), so this only fires on real errors.
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <MailCheck className="text-primary size-10" />
          <h2 className="text-lg font-semibold">Check your email</h2>
          <p className="text-muted-foreground text-sm">
            If an account exists for that email, we&apos;ve sent a link to reset
            your password.
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
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link.
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        </Form>
        <p className="text-muted-foreground mt-6 text-center text-sm">
          Remembered your password?{" "}
          <Link href="/login" className="text-foreground hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
