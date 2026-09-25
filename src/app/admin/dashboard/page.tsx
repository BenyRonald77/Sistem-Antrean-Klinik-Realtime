"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import { RealtimeEvent } from "@/lib/realtime";

type Me = { id: string; name: string; email: string; role: string };
type Counter = { id: string; name: string; services: string[] };
type BoardEntry = { id: string; code: string; serviceName: string; patientName: string };
type Board = { current: BoardEntry | null; waiting: BoardEntry[] };
type ServiceStat = {
  serviceName: string;
  total: number;
  done: number;
  skipped: number;
  avgWaitMinutes: number | null;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [counterId, setCounterId] = useState("");
  const [board, setBoard] = useState<Board>({ current: null, waiting: [] });
  const [stats, setStats] = useState<ServiceStat[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { user: Me | null }) => {
        if (!data.user) {
          router.replace("/admin/login");
          return;
        }
        setMe(data.user);
      })
      .finally(() => setCheckingAuth(false));
  }, [router]);

  const loadCounters = useCallback(async () => {
    const res = await fetch("/api/admin/counters");
    if (!res.ok) return;
    const data: { counters: Counter[] } = await res.json();
    setCounters(data.counters);
    setCounterId((current) => current || data.counters[0]?.id || "");
  }, []);

  const loadBoard = useCallback(async (id: string) => {
    if (!id) return;
    const res = await fetch(`/api/admin/queue/board?counterId=${id}`);
    if (!res.ok) return;
    setBoard(await res.json());
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (!res.ok) return;
    const data: { stats: ServiceStat[] } = await res.json();
    setStats(data.stats);
  }, []);

  useEffect(() => {
    if (me) loadCounters();
  }, [me, loadCounters]);

  useEffect(() => {
    if (counterId) loadBoard(counterId);
  }, [counterId, loadBoard]);

  useEffect(() => {
    if (me) loadStats();
  }, [me, loadStats]);

  useEffect(() => {
    if (!me) return;
    const socket = getSocket();
    const refresh = () => {
      if (counterId) loadBoard(counterId);
      loadStats();
    };
    socket.on(RealtimeEvent.QUEUE_UPDATED, refresh);
    return () => {
      socket.off(RealtimeEvent.QUEUE_UPDATED, refresh);
    };
  }, [me, counterId, loadBoard, loadStats]);

  async function runAction(url: string, body: Record<string, unknown>) {
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Aksi gagal");
        return;
      }
      await loadBoard(counterId);
    } catch {
      setActionError("Terjadi kesalahan jaringan");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Memuat...</p>
      </main>
    );
  }

  if (!me) return null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-700">Dashboard Admin</h1>
          <p className="text-sm text-slate-500">
            Masuk sebagai {me.name} ({me.role})
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          Keluar
        </button>
      </header>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Loket
          <select
            value={counterId}
            onChange={(event) => setCounterId(event.target.value)}
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2"
          >
            {counters.map((counter) => (
              <option key={counter.id} value={counter.id}>
                {counter.name} ({counter.services.join(", ") || "belum ada layanan"})
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-5 text-center">
            <p className="text-sm uppercase tracking-wide text-slate-500">
              Nomor Aktif
            </p>
            <p className="mt-1 text-4xl font-black text-brand-700">
              {board.current?.code ?? "—"}
            </p>
            <p className="text-sm text-slate-500">
              {board.current ? `${board.current.serviceName} — ${board.current.patientName}` : "Belum ada"}
            </p>
          </div>

          <div className="flex flex-col justify-center gap-2">
            <button
              disabled={busy || !counterId}
              onClick={() => runAction("/api/admin/queue/call-next", { counterId })}
              className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Panggil Berikutnya
            </button>
            <div className="flex gap-2">
              <button
                disabled={busy || !counterId || !board.current}
                onClick={() => runAction("/api/admin/queue/recall", { counterId })}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Panggil Ulang
              </button>
              <button
                disabled={busy || !board.current}
                onClick={() =>
                  board.current && runAction("/api/admin/queue/complete", { entryId: board.current.id })
                }
                className="flex-1 rounded-lg border border-emerald-300 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                Selesai
              </button>
              <button
                disabled={busy || !board.current}
                onClick={() =>
                  board.current && runAction("/api/admin/queue/skip", { entryId: board.current.id })
                }
                className="flex-1 rounded-lg border border-rose-300 px-4 py-2 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                Lewati
              </button>
            </div>
          </div>
        </div>

        {actionError && <p className="mt-4 text-sm text-rose-600">{actionError}</p>}
      </section>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-800">
          Antrean Menunggu ({board.waiting.length})
        </h2>
        {board.waiting.length === 0 ? (
          <p className="text-sm text-slate-500">Tidak ada antrean menunggu.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {board.waiting.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-2">
                <span className="font-medium">{entry.code}</span>
                <span className="text-sm text-slate-500">
                  {entry.serviceName} — {entry.patientName}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-800">Statistik Hari Ini</h2>
        {stats.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2">Layanan</th>
                <th className="py-2">Total</th>
                <th className="py-2">Selesai</th>
                <th className="py-2">Dilewati</th>
                <th className="py-2">Rata-rata Tunggu</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.serviceName} className="border-b border-slate-100">
                  <td className="py-2">{row.serviceName}</td>
                  <td className="py-2">{row.total}</td>
                  <td className="py-2">{row.done}</td>
                  <td className="py-2">{row.skipped}</td>
                  <td className="py-2">
                    {row.avgWaitMinutes !== null ? `${row.avgWaitMinutes} menit` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
