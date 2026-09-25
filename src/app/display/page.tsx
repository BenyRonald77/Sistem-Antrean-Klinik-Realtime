"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import { RealtimeEvent, type QueueCalledPayload } from "@/lib/realtime";

type DisplayState = {
  queueDate: string;
  nowServing: {
    counterId: string;
    counterName: string;
    code: string;
    serviceName: string;
    patientName: string;
  }[];
  upcoming: {
    serviceId: string;
    serviceName: string;
    entries: string[];
  }[];
};

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "id-ID";
  utterance.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export default function DisplayPage() {
  const [state, setState] = useState<DisplayState | null>(null);
  const [flash, setFlash] = useState<QueueCalledPayload | null>(null);
  const [connected, setConnected] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/queue/display", { cache: "no-store" });
      if (!res.ok) return;
      const data: DisplayState = await res.json();
      setState(data);
    } catch {
      // biarkan state lama tampil, akan dicoba lagi saat event realtime berikutnya
    }
  }, []);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 15000);
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onUpdated = () => refetch();
    const onCalled = (payload: QueueCalledPayload) => {
      setFlash(payload);
      speak(
        `Nomor ${payload.code.split("").join(" ")}, silakan menuju ${payload.counterName}`,
      );
      refetch();
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setFlash(null), 8000);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(RealtimeEvent.QUEUE_UPDATED, onUpdated);
    socket.on(RealtimeEvent.QUEUE_CALLED, onCalled);

    setConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(RealtimeEvent.QUEUE_UPDATED, onUpdated);
      socket.off(RealtimeEvent.QUEUE_CALLED, onCalled);
    };
  }, [refetch]);

  return (
    <main className="min-h-screen bg-slate-900 px-8 py-10 text-white">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Layar Antrean Klinik</h1>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            connected ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {connected ? "Realtime aktif" : "Menyambungkan ulang..."}
        </span>
      </header>

      {flash && (
        <div className="mb-8 animate-pulse rounded-2xl border-4 border-amber-400 bg-amber-500/10 p-8 text-center">
          <p className="text-lg uppercase tracking-widest text-amber-300">
            Sedang Dipanggil
          </p>
          <p className="mt-2 text-7xl font-black text-amber-300">{flash.code}</p>
          <p className="mt-2 text-2xl">
            {flash.serviceName} — {flash.counterName}
          </p>
        </div>
      )}

      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(state?.nowServing ?? []).length === 0 && (
          <p className="col-span-full text-center text-slate-400">
            Belum ada nomor yang sedang dipanggil.
          </p>
        )}
        {state?.nowServing.map((serving) => (
          <div
            key={serving.counterId}
            className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-center"
          >
            <p className="text-sm uppercase tracking-wide text-slate-400">
              {serving.counterName}
            </p>
            <p className="mt-2 text-5xl font-black text-brand-500">{serving.code}</p>
            <p className="mt-1 text-slate-300">{serving.serviceName}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-300">
          Antrean Berikutnya
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state?.upcoming.map((service) => (
            <div
              key={service.serviceId}
              className="rounded-xl border border-slate-700 bg-slate-800/60 p-5"
            >
              <p className="font-medium text-slate-200">{service.serviceName}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {service.entries.length > 0 ? service.entries.join(", ") : "—"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
