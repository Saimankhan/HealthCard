"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";

import { apiFetch, apiFetchWithMeta } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmptyState } from "@/components/patient/section-card";

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

type PatientOption = {
  id: string;
  user: { id: string; name: string; email: string };
};

export function CreatePrescriptionForm({
  initialPatientId,
  initialAppointmentId,
}: {
  initialPatientId?: string;
  initialAppointmentId?: string;
}) {
  const router = useRouter();
  const [patientId, setPatientId] = useState(initialPatientId ?? "");
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<PatientOption[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medications: [{ name: "", dosage: "", frequency: "", durationDays: "" }],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "medications",
  });

  useEffect(() => {
    if (patientId) return;
    const timeout = setTimeout(() => {
      apiFetchWithMeta<PatientOption[]>(
        `/api/patients?sortOrder=asc&pageSize=20${
          search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""
        }`
      )
        .then(({ data }) => setPatients(data))
        .catch(() => setPatients([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, patientId]);

  useEffect(() => {
    if (!initialPatientId) return;
    apiFetch<PatientOption>(`/api/patients/${initialPatientId}`)
      .then((data) => setSelectedPatient(data))
      .catch(() => undefined);
  }, [initialPatientId]);

  function selectPatient(patient: PatientOption) {
    setSelectedPatient(patient);
    setPatientId(patient.id);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await apiFetch("/api/prescriptions", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          appointmentId: initialAppointmentId || undefined,
          medications: values.medications.map((m) => ({
            ...m,
            durationDays: m.durationDays ? Number(m.durationDays) : undefined,
          })),
          notes: values.notes || undefined,
        }),
      });
      toast.success("Prescription created");
      router.push("/doctor/prescriptions");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to create prescription"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!patientId) {
    return (
      <div className="flex flex-col gap-4">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search patients by name or email..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {patients === null ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : patients.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState message="No assigned patients found." />
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {patients.map((patient) => (
              <Card key={patient.id}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium">{patient.user.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {patient.user.email}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => selectPatient(patient)}>
                    Select
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-muted-foreground text-sm">Patient</p>
            <p className="font-medium">
              {selectedPatient?.user.name ?? "Selected patient"}
            </p>
          </div>
          {!initialPatientId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPatientId("");
                setSelectedPatient(null);
              }}
            >
              Change
            </Button>
          )}
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
                          <Input {...field} placeholder="500mg" />
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
                          <Input {...field} placeholder="2x daily" />
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
            {isSubmitting ? "Saving..." : "Create prescription"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
