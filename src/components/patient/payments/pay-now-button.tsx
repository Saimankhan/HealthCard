"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function PayNowButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);

  async function payNow() {
    setLoading(true);
    try {
      const { url } = await apiFetch<{ url: string }>(
        `/api/payments/${paymentId}/checkout`,
        { method: "POST" }
      );
      window.location.href = url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to start checkout"
      );
      setLoading(false);
    }
  }

  return (
    <Button onClick={payNow} disabled={loading}>
      <CreditCard />
      {loading ? "Redirecting..." : "Pay now"}
    </Button>
  );
}
