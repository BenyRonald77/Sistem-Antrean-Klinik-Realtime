import { prisma } from "@/lib/prisma";

/**
 * MVP mendukung satu klinik per instance (multi-cabang direncanakan di fase 2,
 * lihat docs/PRD.md bagian Out of Scope). Helper ini mengambil klinik yang ada
 * di database — dibuat lewat `npm run prisma:seed`.
 */
export async function getDefaultClinic() {
  const clinic = await prisma.clinic.findFirst({ orderBy: { createdAt: "asc" } });
  if (!clinic) {
    throw new Error(
      "Belum ada data klinik. Jalankan `npm run prisma:seed` terlebih dahulu.",
    );
  }
  return clinic;
}
