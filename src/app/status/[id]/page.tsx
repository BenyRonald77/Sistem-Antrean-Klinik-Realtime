"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import { RealtimeEvent } from "@/lib/realtime";

type EntryStatus = {
  code: string;
  serviceName: string;
  status: "WAITING" | "CALLED" | "SKIPPED" | "DONE";
  counterName: string | null;
  position: number | null;
};

const statusLabel: Record<EntryStatus["status"], string> = {
  WAITING: "Menunggu",
  CALLED: "Sedang Dipanggil",
  SKIPPED: "Dilewati",
  DONE: "Selesai Dilayani",
};

export default function QueueStatusPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<EntryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/queue/entries/${params.id}`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Data tidak ditemukan");
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) setError("Gagal memuat status antrean");
      }
    }

    load();
    const interval = setInterval(load, 10000);

    const socket = getSocket();
    socket.on(RealtimeEvent.QUEUE_UPDATED, load);
    socket.on(RealtimeEvent.QUEUE_CALLED, load);

    return () => {
      cancelled = true;
      clearInterval(interval);
      socket.off(RealtimeEvent.QUEUE_UPDATED, load);
      socket.off(RealtimeEvent.QUEUE_CALLED, load);
    };
  }, [params.id]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-rose-600">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-slate-500">Memuat status antrean...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm uppercase tracking-widest text-slate-500">
        {data.serviceName}
      </p>
      <p className="text-7xl font-black text-brand-700">{data.code}</p>
      <p className="rounded-full bg-brand-50 px-4 py-1 font-medium text-brand-700">
        {statusLabel[data.status]}
      </p>
      {data.status === "WAITING" && data.position !== null && (
        <p className="text-slate-600">
          Ada {data.position} antrean di depan Anda.
        </p>
      )}
      {data.status === "CALLED" && data.counterName && (
        <p className="text-slate-600">
          Silakan menuju <span className="font-semibold">{data.counterName}</span>.
        </p>
      )}
    </main>
  );
}
