export type Medication = {
  name: string;
  dosage: string;
  frequency: string;
  durationDays?: number;
};

export type PrescriptionListItem = {
  id: string;
  medications: Medication[];
  notes: string | null;
  issuedAt: string;
  doctor: {
    id: string;
    licenseNumber: string;
    user: { id: string; name: string; email: string };
  };
  patient: {
    id: string;
    user: { id: string; name: string; email: string };
  };
};
