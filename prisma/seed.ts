import "dotenv/config";
import { randomUUID } from "node:crypto";

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { hashPassword } from "better-auth/crypto";

import { PrismaClient } from "../src/generated/prisma/client";
import type {
  BloodGroup,
  Gender,
  AppointmentStatus,
} from "../src/generated/prisma/client";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Password123!";

async function createUserWithProfile(options: {
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "PATIENT";
}) {
  const existing = await prisma.user.findUnique({
    where: { email: options.email },
  });
  if (existing) {
    return existing;
  }

  const userId = randomUUID();
  const hashed = await hashPassword(DEMO_PASSWORD);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        id: userId,
        name: options.name,
        email: options.email,
        emailVerified: true,
        role: options.role,
      },
    });

    await tx.account.create({
      data: {
        id: randomUUID(),
        userId: createdUser.id,
        providerId: "credential",
        accountId: createdUser.id,
        password: hashed,
      },
    });

    return createdUser;
  });

  return user;
}

async function main() {
  console.log("Seeding HealthCard demo data...");

  // -----------------------------------------------------------------
  // Super Admin (root account)
  // -----------------------------------------------------------------
  const adminUser = await createUserWithProfile({
    name: "System Administrator",
    email: "admin@healthcard.dev",
    role: "SUPER_ADMIN",
  });
  // Ensure the role is SUPER_ADMIN even if this account was seeded by an
  // earlier phase (before the SUPER_ADMIN role existed).
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { role: "SUPER_ADMIN" },
  });
  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id, department: "IT Operations" },
  });

  // -----------------------------------------------------------------
  // Specializations
  // -----------------------------------------------------------------
  const specializationNames = [
    "Cardiology",
    "Pediatrics",
    "Dermatology",
    "General Medicine",
    "Orthopedics",
    "Neurology",
  ];
  const specializations = new Map<string, string>();
  for (const name of specializationNames) {
    const spec = await prisma.specialization.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} specialists` },
    });
    specializations.set(name, spec.id);
  }

  // -----------------------------------------------------------------
  // Doctors
  // -----------------------------------------------------------------
  const doctorSeeds = [
    {
      name: "Dr. Sarah Chen",
      email: "sarah.chen@healthcard.dev",
      licenseNumber: "CARD-10234",
      bio: "Board-certified cardiologist with a focus on preventive heart health.",
      experienceYears: 12,
      consultationFee: "150.00",
      specs: ["Cardiology", "General Medicine"],
    },
    {
      name: "Dr. James Okafor",
      email: "james.okafor@healthcard.dev",
      licenseNumber: "PED-20567",
      bio: "Pediatrician dedicated to child wellness and preventive care.",
      experienceYears: 8,
      consultationFee: "100.00",
      specs: ["Pediatrics"],
    },
    {
      name: "Dr. Maria Lopez",
      email: "maria.lopez@healthcard.dev",
      licenseNumber: "DERM-30891",
      bio: "Dermatologist specializing in clinical and cosmetic skin care.",
      experienceYears: 15,
      consultationFee: "120.00",
      specs: ["Dermatology"],
    },
  ];

  const doctors: { id: string; userId: string; fee: string }[] = [];
  for (const seed of doctorSeeds) {
    const user = await createUserWithProfile({
      name: seed.name,
      email: seed.email,
      role: "DOCTOR",
    });
    const doctor = await prisma.doctor.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        licenseNumber: seed.licenseNumber,
        bio: seed.bio,
        experienceYears: seed.experienceYears,
        consultationFee: seed.consultationFee,
        phone: "+1-555-0100",
      },
    });
    for (const specName of seed.specs) {
      const specializationId = specializations.get(specName)!;
      await prisma.doctorSpecialization.upsert({
        where: {
          doctorId_specializationId: {
            doctorId: doctor.id,
            specializationId,
          },
        },
        update: {},
        create: { doctorId: doctor.id, specializationId },
      });
    }
    doctors.push({ id: doctor.id, userId: user.id, fee: seed.consultationFee });
  }

  // -----------------------------------------------------------------
  // Patients
  // -----------------------------------------------------------------
  const patientSeeds: {
    name: string;
    email: string;
    dateOfBirth: string;
    gender: Gender;
    bloodGroup: BloodGroup;
  }[] = [
    {
      name: "John Smith",
      email: "john.smith@healthcard.dev",
      dateOfBirth: "1985-03-12",
      gender: "MALE",
      bloodGroup: "O_POSITIVE",
    },
    {
      name: "Emily Davis",
      email: "emily.davis@healthcard.dev",
      dateOfBirth: "1990-07-22",
      gender: "FEMALE",
      bloodGroup: "A_POSITIVE",
    },
    {
      name: "Michael Brown",
      email: "michael.brown@healthcard.dev",
      dateOfBirth: "1978-11-05",
      gender: "MALE",
      bloodGroup: "B_NEGATIVE",
    },
    {
      name: "Linda Wilson",
      email: "linda.wilson@healthcard.dev",
      dateOfBirth: "1995-01-30",
      gender: "FEMALE",
      bloodGroup: "AB_POSITIVE",
    },
    {
      name: "Robert Taylor",
      email: "robert.taylor@healthcard.dev",
      dateOfBirth: "1965-09-18",
      gender: "MALE",
      bloodGroup: "O_NEGATIVE",
    },
  ];

  const patients: { id: string; userId: string; name: string }[] = [];
  for (const seed of patientSeeds) {
    const user = await createUserWithProfile({
      name: seed.name,
      email: seed.email,
      role: "PATIENT",
    });
    const patient = await prisma.patient.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        dateOfBirth: new Date(seed.dateOfBirth),
        gender: seed.gender,
        bloodGroup: seed.bloodGroup,
        phone: "+1-555-0200",
        address: "123 Main St, Springfield",
        emergencyContactName: "Jane Doe",
        emergencyContactPhone: "+1-555-0911",
      },
    });

    await prisma.healthCard.upsert({
      where: { patientId: patient.id },
      update: {},
      create: {
        patientId: patient.id,
        cardNumber: `HC-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        verificationToken: randomUUID(),
        status: "ACTIVE",
        expiresAt: new Date(
          new Date().setFullYear(new Date().getFullYear() + 3)
        ),
      },
    });

    patients.push({ id: patient.id, userId: user.id, name: seed.name });
  }

  // -----------------------------------------------------------------
  // Appointments, prescriptions, medical history, payments, notifications
  // -----------------------------------------------------------------
  const existingAppointments = await prisma.appointment.count();
  if (existingAppointments === 0) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const appointmentPlans: {
      patient: (typeof patients)[number];
      doctor: (typeof doctors)[number];
      scheduledAt: Date;
      status: AppointmentStatus;
      reason: string;
    }[] = [
      {
        patient: patients[0],
        doctor: doctors[0],
        scheduledAt: new Date(now - 14 * day),
        status: "COMPLETED",
        reason: "Routine cardiac checkup",
      },
      {
        patient: patients[1],
        doctor: doctors[1],
        scheduledAt: new Date(now - 7 * day),
        status: "COMPLETED",
        reason: "Child wellness visit",
      },
      {
        patient: patients[2],
        doctor: doctors[2],
        scheduledAt: new Date(now - 3 * day),
        status: "COMPLETED",
        reason: "Skin rash evaluation",
      },
      {
        patient: patients[3],
        doctor: doctors[0],
        scheduledAt: new Date(now + 2 * day),
        status: "CONFIRMED",
        reason: "Follow-up consultation",
      },
      {
        patient: patients[4],
        doctor: doctors[1],
        scheduledAt: new Date(now + 5 * day),
        status: "PENDING",
        reason: "General health screening",
      },
      {
        patient: patients[0],
        doctor: doctors[2],
        scheduledAt: new Date(now - 1 * day),
        status: "CANCELLED",
        reason: "Dermatology consultation",
      },
    ];

    for (const plan of appointmentPlans) {
      const appointment = await prisma.appointment.create({
        data: {
          patientId: plan.patient.id,
          doctorId: plan.doctor.id,
          scheduledAt: plan.scheduledAt,
          status: plan.status,
          reason: plan.reason,
          cancelledAt: plan.status === "CANCELLED" ? new Date() : null,
        },
      });

      if (plan.status === "COMPLETED") {
        await prisma.prescription.create({
          data: {
            patientId: plan.patient.id,
            doctorId: plan.doctor.id,
            appointmentId: appointment.id,
            medications: [
              {
                name: "Amoxicillin",
                dosage: "500mg",
                frequency: "3x daily",
                durationDays: 7,
              },
              {
                name: "Ibuprofen",
                dosage: "200mg",
                frequency: "as needed",
                durationDays: 5,
              },
            ],
            notes: "Take with food. Follow up if symptoms persist.",
          },
        });

        await prisma.medicalHistory.create({
          data: {
            patientId: plan.patient.id,
            doctorId: plan.doctor.id,
            condition: plan.reason,
            diagnosis: "Mild, managed with medication",
            notes: "Patient responded well during visit.",
          },
        });

        await prisma.payment.create({
          data: {
            patientId: plan.patient.id,
            appointmentId: appointment.id,
            amount: plan.doctor.fee,
            status: "SUCCEEDED",
            method: "CARD",
          },
        });

        await prisma.notification.create({
          data: {
            userId: plan.patient.userId,
            type: "APPOINTMENT_CONFIRMATION",
            title: "Appointment completed",
            message: `Your appointment on ${plan.scheduledAt.toDateString()} has been completed.`,
          },
        });
      }

      if (plan.status === "CONFIRMED") {
        await prisma.payment.create({
          data: {
            patientId: plan.patient.id,
            appointmentId: appointment.id,
            amount: plan.doctor.fee,
            status: "PENDING",
            method: "CARD",
          },
        });

        await prisma.notification.create({
          data: {
            userId: plan.patient.userId,
            type: "APPOINTMENT_CONFIRMATION",
            title: "Appointment confirmed",
            message: `Your appointment is confirmed for ${plan.scheduledAt.toDateString()}.`,
          },
        });
      }

      if (plan.status === "CANCELLED") {
        await prisma.notification.create({
          data: {
            userId: plan.patient.userId,
            type: "APPOINTMENT_CANCELLED",
            title: "Appointment cancelled",
            message: `Your appointment scheduled for ${plan.scheduledAt.toDateString()} was cancelled.`,
          },
        });
      }
    }
  }

  await prisma.notification.upsert({
    where: { id: "seed-admin-welcome-notification" },
    update: {},
    create: {
      id: "seed-admin-welcome-notification",
      userId: adminUser.id,
      type: "GENERAL",
      title: "Welcome to HealthCard",
      message: "The HealthCard platform has been seeded with demo data.",
    },
  });

  console.log("Seed complete.");
  console.log(`Demo login password for all seeded accounts: ${DEMO_PASSWORD}`);
  console.log(`  Admin:    admin@healthcard.dev`);
  console.log(`  Doctors:  ${doctorSeeds.map((d) => d.email).join(", ")}`);
  console.log(`  Patients: ${patientSeeds.map((p) => p.email).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
