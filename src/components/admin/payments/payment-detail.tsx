"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { apiFetch } from "@/lib/api-client";
import { formatCurrency, formatDateTime, formatEnumLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/patient/status-badge";

type PaymentDetail = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  method: string;
  refundedAmount: string | null;
  createdAt: string;
  appointmentId: string | null;
  patient: { user: { name: string; email: string } };
};

const STATUS_OPTIONS = ["PENDING", "SUCCEEDED", "FAILED"];

export function AdminPaymentDetail({ id }: { id: string }) {
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    try {
      const data = await apiFetch<PaymentDetail>(`/api/payments/${id}`);
      setPayment(data);
    } catch {
      setNotFound(true);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(status: string) {
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/payments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Payment updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitRefund() {
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/payments/${id}/refund`, {
        method: "PATCH",
        body: JSON.stringify({
          amount: refundAmount ? Number(refundAmount) : undefined,
        }),
      });
      toast.success("Refund processed");
      setRefundOpen(false);
      setRefundAmount("");
      load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to process refund"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground text-sm">Payment not found.</p>
          <Button
            className="mt-4"
            render={<Link href="/admin/payments">Back to payments</Link>}
          />
        </CardContent>
      </Card>
    );
  }

  if (!payment) {
    return <Skeleton className="h-64 w-full" />;
  }

  const canRefund =
    payment.status === "SUCCEEDED" || payment.status === "PARTIALLY_REFUNDED";

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        render={
          <Link href="/admin/payments">
            <ArrowLeft />
            Back to payments
          </Link>
        }
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoice</CardTitle>
          <StatusBadge status={payment.status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Patient</p>
              <p className="font-medium">{payment.patient.user.name}</p>
              <p className="text-muted-foreground">
                {payment.patient.user.email}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="text-lg font-semibold">
                {formatCurrency(payment.amount, payment.currency)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Payment method</p>
              <p className="font-medium">{formatEnumLabel(payment.method)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{formatDateTime(payment.createdAt)}</p>
            </div>
          </div>

          {(payment.status === "REFUNDED" ||
            payment.status === "PARTIALLY_REFUNDED") && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground">Refunded amount</p>
                <p className="font-medium">
                  {payment.refundedAmount
                    ? formatCurrency(payment.refundedAmount, payment.currency)
                    : "-"}
                </p>
              </div>
            </>
          )}

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            {payment.status === "PENDING" && (
              <Select
                value={payment.status}
                onValueChange={(v) => v && updateStatus(v)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {canRefund && (
              <Button variant="outline" onClick={() => setRefundOpen(true)}>
                Issue refund
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue refund</DialogTitle>
            <DialogDescription>
              Leave the amount blank to refund the full remaining amount.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Refund amount</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder={formatCurrency(payment.amount, payment.currency)}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button disabled={isSubmitting} onClick={submitRefund}>
              {isSubmitting ? "Processing..." : "Confirm refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
