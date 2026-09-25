import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AdminRole } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  const clinic = await prisma.clinic.upsert({
    where: { id: "clinic-demo" },
    update: {},
    create: {
      id: "clinic-demo",
      name: "Klinik Sehat Sentosa",
      timezone: "Asia/Jakarta",
    },
  });

  const [umum, gigi, apotek] = await Promise.all([
    prisma.service.upsert({
      where: { clinicId_prefix: { clinicId: clinic.id, prefix: "A" } },
      update: {},
      create: { clinicId: clinic.id, name: "Poli Umum", prefix: "A" },
    }),
    prisma.service.upsert({
      where: { clinicId_prefix: { clinicId: clinic.id, prefix: "B" } },
      update: {},
      create: { clinicId: clinic.id, name: "Poli Gigi", prefix: "B" },
    }),
    prisma.service.upsert({
      where: { clinicId_prefix: { clinicId: clinic.id, prefix: "C" } },
      update: {},
      create: { clinicId: clinic.id, name: "Apotek", prefix: "C" },
    }),
  ]);

  const counter1 = await prisma.counter.create({
    data: {
      clinicId: clinic.id,
      name: "Loket 1",
      services: {
        create: [{ serviceId: umum.id }, { serviceId: gigi.id }],
      },
    },
  });

  const counter2 = await prisma.counter.create({
    data: {
      clinicId: clinic.id,
      name: "Loket 2 - Apotek",
      services: {
        create: [{ serviceId: apotek.id }],
      },
    },
  });

  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.adminUser.upsert({
    where: { email: "superadmin@klinik.test" },
    update: {},
    create: {
      clinicId: clinic.id,
      name: "Super Admin",
      email: "superadmin@klinik.test",
      passwordHash,
      role: AdminRole.SUPERADMIN,
    },
  });

  const staffPasswordHash = await bcrypt.hash("staff123", 10);
  await prisma.adminUser.upsert({
    where: { email: "staff@klinik.test" },
    update: {},
    create: {
      clinicId: clinic.id,
      name: "Petugas Loket 1",
      email: "staff@klinik.test",
      passwordHash: staffPasswordHash,
      role: AdminRole.STAFF,
    },
  });

  console.log("Seed selesai:");
  console.log(`- Klinik: ${clinic.name}`);
  console.log(`- Layanan: ${[umum, gigi, apotek].map((s) => s.name).join(", ")}`);
  console.log(`- Loket: ${counter1.name}, ${counter2.name}`);
  console.log("- Login superadmin: superadmin@klinik.test / admin123");
  console.log("- Login staff: staff@klinik.test / staff123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
