import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { QueueStatus } from "@/lib/constants";
import { getQueueDateString } from "@/lib/queue-date";

type ServiceBucket = {
  serviceName: string;
  total: number;
  done: number;
  skipped: number;
  waitTimes: number[];
};

export async function GET() {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: auth.session.clinicId },
  });
  const queueDate = getQueueDateString(clinic.timezone);

  const entries = await prisma.queueEntry.findMany({
    where: { queueDate, service: { clinicId: clinic.id } },
    include: { service: true },
  });

  const byService = new Map<string, ServiceBucket>();

  for (const entry of entries) {
    const bucket = byService.get(entry.serviceId) ?? {
      serviceName: entry.service.name,
      total: 0,
      done: 0,
      skipped: 0,
      waitTimes: [],
    };

    bucket.total += 1;
    if (entry.status === QueueStatus.DONE) {
      bucket.done += 1;
      if (entry.calledAt) {
        bucket.waitTimes.push(
          (entry.calledAt.getTime() - entry.createdAt.getTime()) / 60000,
        );
      }
    }
    if (entry.status === QueueStatus.SKIPPED) {
      bucket.skipped += 1;
    }

    byService.set(entry.serviceId, bucket);
  }

  const stats = Array.from(byService.values()).map((bucket) => ({
    serviceName: bucket.serviceName,
    total: bucket.total,
    done: bucket.done,
    skipped: bucket.skipped,
    avgWaitMinutes: bucket.waitTimes.length
      ? Math.round(
          bucket.waitTimes.reduce((sum, value) => sum + value, 0) /
            bucket.waitTimes.length,
        )
      : null,
  }));

  return NextResponse.json({ queueDate, stats });
}
