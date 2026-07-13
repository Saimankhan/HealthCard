"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { authClient } from "@/core/auth/auth-client";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
});

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsSubmitting(true);
    setUnverifiedEmail(null);
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe,
    });
    setIsSubmitting(false);

    if (error) {
      if (error.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(values.email);
      }
      toast.error(error.message ?? "Unable to log in. Check your credentials.");
      return;
    }

    toast.success("Welcome back!");
    router.push("/patient");
    router.refresh();
  }

  async function resendVerification() {
    if (!unverifiedEmail) return;
    try {
      await apiFetch("/api/auth/send-verification-email", {
        method: "POST",
        body: JSON.stringify({
          email: unverifiedEmail,
          callbackURL: "/verify-email",
        }),
      });
      toast.success("Verification email sent.");
    } catch {
      toast.error("Unable to resend verification email.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>
          Welcome back to HealthCard. Enter your details to continue.
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-muted-foreground text-xs hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Remember me</FormLabel>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? "Logging in..." : "Log in"}
            </Button>
            {unverifiedEmail && (
              <Button
                type="button"
                variant="outline"
                onClick={resendVerification}
              >
                Resend verification email
              </Button>
            )}
          </form>
        </Form>
        <p className="text-muted-foreground mt-6 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-foreground hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
