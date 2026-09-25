# Sistem Antrean Klinik Realtime

Sistem antrean digital realtime untuk klinik: layar antrean publik (WebSocket),
dashboard admin untuk petugas loket, dan notifikasi WhatsApp otomatis ke pasien.

Lihat dokumen perencanaan lengkap di [`docs/PRD.md`](./docs/PRD.md).

## Fitur Utama

- **Ambil nomor antrean** (`/kiosk`) — pasien memilih poli, mengisi nama & no. WA, mendapat nomor unik harian.
- **Cek status antrean** (`/status/[id]`) — pasien memantau posisi antreannya secara realtime.
- **Layar antrean publik** (`/display`) — update realtime via Socket.IO, lengkap dengan animasi & audio panggilan (text-to-speech).
- **Dashboard admin** (`/admin`) — login petugas/superadmin, panggil/lewati/selesaikan antrean per loket, lihat statistik harian.
- **Notifikasi WhatsApp otomatis** — saat ambil nomor, saat sisa antrean tinggal beberapa lagi, dan saat dipanggil. Provider bisa diganti (mock untuk dev, Fonnte untuk production) tanpa mengubah logika inti.

## Teknologi

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Custom Node.js server + Socket.IO (realtime WebSocket)
- Prisma ORM (SQLite untuk development, mudah dipindah ke PostgreSQL)
- JWT (cookie httpOnly) untuk sesi admin

## Menjalankan Secara Lokal

1. Install dependencies:

   ```bash
   npm install
   ```

2. Salin file environment lalu sesuaikan bila perlu:

   ```bash
   cp .env.example .env
   ```

3. Buat database & jalankan migrasi + seed data contoh (1 klinik demo, 3 poli, 2 loket, akun admin):

   ```bash
   npm run prisma:migrate
   ```

   (perintah ini otomatis menjalankan seed; untuk menjalankan seed ulang secara manual: `npm run prisma:seed`)

4. Jalankan server development (custom server Next.js + Socket.IO):

   ```bash
   npm run dev
   ```

5. Buka:
   - `http://localhost:3000/kiosk` — ambil nomor antrean
   - `http://localhost:3000/display` — layar antrean (buka di layar TV/monitor ruang tunggu)
   - `http://localhost:3000/admin/login` — dashboard admin

   Akun demo hasil seed:
   - Superadmin: `superadmin@klinik.test` / `admin123`
   - Staff: `staff@klinik.test` / `staff123`

## Konfigurasi Notifikasi WhatsApp

Diatur lewat variabel environment `WA_PROVIDER`:

- `mock` (default) — tidak mengirim WA sungguhan, hanya mencatat log ke console & `NotificationLog` di database. Cocok untuk development/testing tanpa kredensial nyata.
- `fonnte` — mengirim WA sungguhan lewat [Fonnte](https://fonnte.com). Isi `WA_FONNTE_TOKEN` dengan token device Fonnte Anda (tersedia mode sandbox/trial gratis untuk uji coba).

Provider lain dapat ditambahkan dengan membuat class baru yang mengimplementasikan
interface `WhatsAppProvider` (lihat `src/lib/whatsapp/types.ts`) tanpa perlu
mengubah kode di luar folder `src/lib/whatsapp/`.

## Struktur Proyek

```
docs/PRD.md                  Dokumen PRD
prisma/schema.prisma         Skema database
prisma/seed.ts                Data contoh (klinik, poli, loket, admin)
server/index.ts                Custom server (Next.js + Socket.IO)
src/lib/queue-service.ts      Logika bisnis inti antrean
src/lib/whatsapp/             Adapter notifikasi WhatsApp
src/lib/realtime.ts           Helper broadcast event Socket.IO
src/lib/auth.ts               Autentikasi admin (JWT)
src/app/kiosk                 Halaman ambil nomor antrean
src/app/status/[id]           Halaman cek status antrean pasien
src/app/display               Layar antrean publik (realtime)
src/app/admin                 Login & dashboard admin
src/app/api                   API routes (publik & admin)
```

## Skrip yang Tersedia

| Skrip | Keterangan |
|---|---|
| `npm run dev` | Jalankan server development |
| `npm run build` | Build production (Next.js) |
| `npm start` | Jalankan server production (`NODE_ENV=production`) |
| `npm run typecheck` | Cek tipe TypeScript tanpa build |
| `npm run lint` | Jalankan ESLint |
| `npm run prisma:migrate` | Migrasi database (development) |
| `npm run prisma:seed` | Jalankan seed data contoh |
| `npm run db:push` | Sinkronkan schema ke database tanpa membuat file migrasi |

## Deployment

Karena aplikasi ini membutuhkan koneksi WebSocket persisten (Socket.IO), deploy
ke **Node.js server/VPS/container** (bukan platform serverless murni seperti
Vercel Functions, karena fungsi serverless tidak mempertahankan koneksi
WebSocket jangka panjang).

1. Set environment variable production, terutama:
   - `DATABASE_URL` — untuk production disarankan PostgreSQL. Ubah `provider` di
     `prisma/schema.prisma` dari `sqlite` menjadi `postgresql`, lalu jalankan
     `npx prisma migrate deploy`.
   - `JWT_SECRET` — ganti dengan string acak yang panjang & rahasia.
   - `WA_PROVIDER=fonnte` beserta `WA_FONNTE_TOKEN` bila ingin notifikasi WA aktif.
2. Build aplikasi: `npm run build`
3. Jalankan: `npm start`
4. Pastikan reverse proxy (mis. Nginx) meneruskan upgrade koneksi WebSocket di
   path `/socket.io` (header `Upgrade`/`Connection`) ke server Node.js.

## Catatan Keamanan

- Password admin di-hash dengan bcrypt sebelum disimpan.
- Sesi admin memakai JWT yang disimpan di cookie `httpOnly` (tidak bisa diakses
  JavaScript sisi client) — set `secure: true` otomatis aktif saat production.
- Ganti kredensial akun demo (`superadmin@klinik.test` / `staff@klinik.test`)
  sebelum digunakan di lingkungan production.
