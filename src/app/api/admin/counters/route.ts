import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const counters = await prisma.counter.findMany({
    where: { clinicId: auth.session.clinicId, isActive: true },
    orderBy: { name: "asc" },
    include: { services: { include: { service: true } } },
  });

  return NextResponse.json({
    counters: counters.map((counter) => ({
      id: counter.id,
      name: counter.name,
      services: counter.services.map((cs) => cs.service.name),
    })),
  });
}
