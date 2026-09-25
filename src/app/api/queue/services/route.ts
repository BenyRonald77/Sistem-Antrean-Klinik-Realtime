import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultClinic } from "@/lib/clinic";

export const dynamic = "force-dynamic";

export async function GET() {
  const clinic = await getDefaultClinic();
  const services = await prisma.service.findMany({
    where: { clinicId: clinic.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, prefix: true },
  });
  return NextResponse.json({ services });
}
