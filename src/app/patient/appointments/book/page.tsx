import type { Metadata } from "next";
import { BookAppointment } from "@/components/patient/appointments/book-appointment";

export const metadata: Metadata = { title: "Book Appointment - HealthCard" };

export default function BookAppointmentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Book an appointment</h1>
        <p className="text-muted-foreground text-sm">
          Search for a doctor and choose a time that works for you.
        </p>
      </div>
      <BookAppointment />
    </div>
  );
}
