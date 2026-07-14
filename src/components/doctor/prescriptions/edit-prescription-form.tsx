"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Download, Plus, Trash2 } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { downloadPrescriptionPdf } from "@/lib/prescription-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { PrescriptionListItem } from "@/components/patient/prescriptions/types";

const medicationSchema = z.object({
  name: z.string().trim().min(1, "Required").max(200),
  dosage: z.string().trim().min(1, "Required").max(100),
  frequency: z.string().trim().min(1, "Required").max(100),
  durationDays: z.string().trim().optional().or(z.literal("")),
});

const formSchema = z.object({
  medications: z.array(medicationSchema).min(1),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export function EditPrescriptionForm({ id }: { id: string }) {
  const router = useRouter();
  const [prescription, setPrescription] = useState<PrescriptionListItem | null>(
    null
  );
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { medications: [], notes: "" },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "medications",
  });

  useEffect(() => {
    apiFetch<PrescriptionListItem>(`/api/prescriptions/${id}`)
      .then((data) => {
        setPrescription(data);
        form.reset({
          medications: data.medications.map((m) => ({
            ...m,
            durationDays: m.durationDays ? String(m.durationDays) : "",
          })),
          notes: data.notes ?? "",
        });
      })
      .catch(() => setNotFound(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/prescriptions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          medications: values.medications.map((m) => ({
            ...m,
            durationDays: m.durationDays ? Number(m.durationDays) : undefined,
          })),
          notes: values.notes || undefined,
        }),
      });
      toast.success("Prescription updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete() {
    setIsDeleting(true);
    try {
      await apiFetch(`/api/prescriptions/${id}`, { method: "DELETE" });
      toast.success("Prescription deleted");
      router.push("/doctor/prescriptions");
    } catch {
      toast.error("Unable to delete prescription");
    } finally {
      setIsDeleting(false);
    }
  }

  if (notFound) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground text-sm">
            Prescription not found.
          </p>
          <Button
            className="mt-4"
            render={
              <Link href="/doctor/prescriptions">Back to prescriptions</Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  if (!prescription) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        render={
          <Link href="/doctor/prescriptions">
            <ArrowLeft />
            Back to prescriptions
          </Link>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{prescription.patient.user.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadPrescriptionPdf(prescription)}
            >
              <Download />
              PDF
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive" size="sm">
                    <Trash2 />
                    Delete
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this prescription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep it</AlertDialogCancel>
                  <AlertDialogAction disabled={isDeleting} onClick={onDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Issued {formatDate(prescription.issuedAt)}
        </CardContent>
      </Card>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <Card key={field.id}>
                <CardContent className="grid gap-3 py-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                  <FormField
                    control={form.control}
                    name={`medications.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medication</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`medications.${index}.dosage`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dosage</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`medications.${index}.frequency`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`medications.${index}.durationDays`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() =>
              append({
                name: "",
                dosage: "",
                frequency: "",
                durationDays: "",
              })
            }
          >
            <Plus />
            Add medication
          </Button>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting} className="w-fit">
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
