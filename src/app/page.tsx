import Link from "next/link";

const links = [
  {
    href: "/kiosk",
    title: "Ambil Nomor Antrean",
    description: "Halaman untuk pasien mengambil nomor antrean.",
  },
  {
    href: "/display",
    title: "Layar Antrean",
    description: "Tampilan publik realtime untuk ruang tunggu.",
  },
  {
    href: "/admin/login",
    title: "Dashboard Admin",
    description: "Login petugas & superadmin untuk mengelola antrean.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-brand-700">
          Sistem Antrean Klinik Realtime
        </h1>
        <p className="mt-2 text-slate-600">
          Pilih halaman yang ingin Anda buka.
        </p>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md"
          >
            <h2 className="font-semibold text-brand-700">{link.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{link.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
