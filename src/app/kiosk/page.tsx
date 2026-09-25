"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Service = { id: string; name: string; prefix: string };

type IssuedResult = {
  entry: { id: string; code: string };
  position: number;
};

export default function KioskPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IssuedResult | null>(null);

  useEffect(() => {
    fetch("/api/queue/services")
      .then((res) => res.json())
      .then((data: { services: Service[] }) => {
        setServices(data.services);
        if (data.services[0]) setServiceId(data.services[0].id);
      })
      .catch(() => setError("Gagal memuat daftar layanan"));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/queue/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, patientName, patientPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengambil nomor antrean");
        return;
      }
      setResult(data);
    } catch {
      setError("Terjadi kesalahan jaringan, coba lagi");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setPatientName("");
    setPatientPhone("");
  }

  if (result) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-sm uppercase tracking-widest text-slate-500">
          Nomor Antrean Anda
        </p>
        <p className="text-7xl font-black text-brand-700">{result.entry.code}</p>
        <p className="text-slate-600">
          Ada {result.position} antrean di depan Anda. Kami akan mengirim kabar
          via WhatsApp saat giliran Anda mendekat.
        </p>
        <div className="flex gap-3">
          <Link
            href={`/status/${result.entry.id}`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
          >
            Cek Status
          </Link>
          <button
            onClick={reset}
            className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50"
          >
            Ambil Nomor Lagi
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Ambil Nomor Antrean</h1>
        <p className="mt-1 text-sm text-slate-500">
          Isi data berikut untuk mendapatkan nomor antrean.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Pilih Layanan / Poli
          <select
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            required
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Nama Pasien
          <input
            value={patientName}
            onChange={(event) => setPatientName(event.target.value)}
            required
            maxLength={100}
            placeholder="Nama lengkap"
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Nomor WhatsApp
          <input
            value={patientPhone}
            onChange={(event) => setPatientPhone(event.target.value)}
            required
            placeholder="08xxxxxxxxxx"
            pattern="[0-9+ ]{8,20}"
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !serviceId}
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Memproses..." : "Ambil Nomor Antrean"}
        </button>
      </form>
    </main>
  );
}
