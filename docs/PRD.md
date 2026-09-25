# PRD — Sistem Antrean Klinik Realtime

| | |
|---|---|
| **Dokumen** | Product Requirements Document |
| **Produk** | Sistem Antrean Klinik Realtime |
| **Versi** | 1.0 |
| **Tanggal** | 25 September 2026 |
| **Pemilik Produk** | BenyRonald77 |
| **Status** | Draft — untuk implementasi |

---

## 1. Latar Belakang & Masalah

Klinik kecil-menengah umumnya masih memanggil pasien secara manual (panggilan suara oleh petugas, papan tulis, atau kertas nomor antrean). Masalah yang muncul:

- Pasien tidak tahu perkiraan giliran mereka sehingga menumpuk di ruang tunggu.
- Petugas front office sibuk menjawab pertanyaan "nomor berapa sekarang?" berulang kali.
- Tidak ada data historis untuk mengukur rata-rata waktu tunggu atau beban per poli/dokter.
- Pasien yang datang dari jauh tidak mendapat kepastian kapan harus tiba di klinik.

## 2. Tujuan Produk

Membangun sistem antrean digital realtime untuk klinik yang terdiri dari:

1. **Layar antrean publik** (TV/monitor ruang tunggu) yang menampilkan nomor yang sedang dipanggil secara realtime.
2. **Dashboard admin** untuk petugas/perawat mengelola antrean per loket/poli (panggil, lewati, selesai).
3. **Notifikasi WhatsApp** otomatis ke pasien saat nomornya mendekati giliran dan saat dipanggil.

### Tujuan Terukur (Success Metrics)

| Metrik | Target |
|---|---|
| Update layar antrean sampai ke client | < 1 detik setelah petugas memanggil nomor |
| Pengurangan pertanyaan manual "nomor berapa sekarang" ke petugas | turun signifikan (indikator kualitatif dari staf) |
| Notifikasi WA terkirim setelah trigger (dipanggil / 3 antrean lagi) | < 10 detik |
| Uptime layanan realtime saat jam operasional | ≥ 99% |

## 3. Target Pengguna & Peran

| Peran | Deskripsi | Akses |
|---|---|---|
| **Pasien** | Mengambil nomor antrean, memantau status, menerima notifikasi WA | Halaman ambil nomor & cek status (publik, tanpa login) |
| **Petugas Loket / Perawat (Admin Operasional)** | Memanggil, melewati (skip), atau menyelesaikan antrean pasien pada loket/poli yang ditangani | Dashboard admin (login) |
| **Admin Klinik (Superadmin)** | Mengatur data loket/poli, dokter, jam operasional, melihat laporan & statistik | Dashboard admin (login, role lebih tinggi) |
| **Layar Publik (Display)** | Perangkat pasif di ruang tunggu yang hanya menampilkan data, tanpa interaksi | Halaman display (tanpa login, read-only) |

## 4. Lingkup (Scope)

### 4.1 Dalam Lingkup (In Scope — MVP)

1. Ambil nomor antrean digital per poli/layanan (mis. Poli Umum, Poli Gigi, Apotek) via halaman web/kiosk.
2. Generate nomor antrean harian dengan prefix per poli (contoh: `A-001`, `B-014`), reset otomatis tiap hari.
3. Dashboard admin per loket: lihat daftar antrean berjalan, tombol **Panggil Berikutnya**, **Panggil Ulang**, **Lewati (Skip)**, **Selesai**.
4. Layar antrean publik (display board) yang update realtime via WebSocket/SSE: menampilkan nomor yang sedang dipanggil, loket tujuan, dan daftar antrean berikutnya, plus notifikasi suara (text-to-speech / audio cue) tiap kali ada panggilan baru.
5. Notifikasi WhatsApp otomatis:
   - Saat pasien berhasil ambil nomor (konfirmasi + estimasi).
   - Saat sisa antrean di depan pasien tinggal N (default 3).
   - Saat nomor pasien dipanggil.
6. Statistik harian sederhana di dashboard: total pasien dilayani, rata-rata waktu tunggu, jumlah yang di-skip, per poli.
7. Autentikasi admin (email/password) dengan role `staff` dan `superadmin`.
8. Manajemen master data: Poli/Layanan, Loket, jam operasional.

### 4.2 Luar Lingkup (Out of Scope — fase berikutnya)

- Aplikasi mobile native (Android/iOS).
- Integrasi rekam medis elektronik (RME/EMR).
- Pembayaran/BPJS/asuransi.
- Multi-cabang/multi-klinik dalam satu instance (direncanakan sebagai fase 2).
- Verifikasi nomor WA (OTP) — fase 1 memakai input manual nomor WA pasien.

## 5. Alur Pengguna Utama (User Flows)

### 5.1 Alur Pasien — Ambil Nomor Antrean

1. Pasien membuka halaman ambil nomor (via kiosk/tablet di klinik atau link publik).
2. Memilih poli/layanan tujuan.
3. Mengisi nama & nomor WhatsApp (untuk notifikasi).
4. Sistem menerbitkan nomor antrean → ditampilkan di layar + dikirim juga via WA (opsional tampil di layar HP pasien: nomor, estimasi posisi, link status).
5. Pasien menunggu; menerima notifikasi WA saat mendekati giliran dan saat dipanggil.

### 5.2 Alur Petugas — Memanggil Antrean

1. Petugas login ke dashboard admin.
2. Memilih loket yang ditangani.
3. Klik **Panggil Berikutnya** → sistem mengambil antrean paling depan berstatus `waiting` untuk poli tersebut, mengubah status jadi `called`, broadcast ke layar publik & kirim notifikasi WA.
4. Jika pasien tidak hadir, petugas klik **Lewati** → status jadi `skipped`, lanjut ke antrean berikutnya.
5. Setelah pasien selesai dilayani, petugas klik **Selesai** → status jadi `done`, waktu selesai dicatat untuk statistik.

### 5.3 Alur Layar Publik

1. Layar terhubung ke server via WebSocket saat dibuka (halaman auto-reconnect bila koneksi putus).
2. Saat ada event "panggilan baru" dari server, layar menampilkan animasi + memutar audio "Nomor A-012, silakan menuju Loket 2" dan memperbarui daftar 5 antrean berikutnya.

## 6. Kebutuhan Fungsional (Functional Requirements)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-1 | Sistem dapat menerbitkan nomor antrean unik per poli per hari, format `[Prefix]-[Nomor Urut 3 digit]` | Must |
| FR-2 | Sistem menyimpan status antrean: `waiting`, `called`, `skipped`, `done` | Must |
| FR-3 | Petugas dapat memanggil antrean berikutnya untuk loket/poli yang ditangani | Must |
| FR-4 | Perubahan status antrean di-broadcast realtime (WebSocket) ke semua client yang subscribe (display & dashboard lain) | Must |
| FR-5 | Layar publik menampilkan nomor sedang dipanggil + 5 antrean berikutnya, update tanpa refresh manual | Must |
| FR-6 | Sistem mengirim notifikasi WhatsApp pada 3 kondisi: ambil nomor, sisa N antrean lagi, saat dipanggil | Must |
| FR-7 | Dashboard admin menampilkan statistik: total dilayani, rata-rata waktu tunggu, total skip (per hari, per poli) | Should |
| FR-8 | Superadmin dapat CRUD data Poli/Layanan dan Loket | Must |
| FR-9 | Autentikasi admin dengan role-based access (staff vs superadmin) | Must |
| FR-10 | Nomor antrean & counter reset otomatis pada pergantian hari (berdasarkan timezone klinik) | Must |
| FR-11 | Jika koneksi WebSocket terputus, client (display/dashboard) mencoba reconnect otomatis dan menyinkronkan ulang state terakhir | Should |
| FR-12 | Kegagalan pengiriman WA dicatat di log notifikasi (status terkirim/gagal) tanpa menghentikan proses antrean | Should |

## 7. Kebutuhan Non-Fungsional

| Kategori | Kebutuhan |
|---|---|
| **Performa** | Update realtime end-to-end < 1 detik pada kondisi jaringan klinik normal |
| **Skalabilitas** | Mendukung minimal 5 loket aktif bersamaan dan ratusan antrean per hari per klinik |
| **Keandalan** | Data antrean persisten di database (tidak hilang saat server restart) |
| **Keamanan** | Password admin di-hash (bcrypt/argon2), endpoint admin dilindungi autentikasi & otorisasi role |
| **Observability** | Log kejadian penting: panggilan antrean, pengiriman notifikasi WA (sukses/gagal) |
| **Portabilitas** | Provider notifikasi WhatsApp dibuat sebagai adapter/interface agar mudah ganti provider (Fonnte, Wablas, WA Cloud API resmi, dsb.) tanpa mengubah logika inti |
| **Aksesibilitas Display** | Layar antrean mudah dibaca dari jarak ± 5 meter (ukuran font besar, kontras tinggi) |

## 8. Arsitektur Teknis (Ringkasan)

- **Frontend & Backend**: Next.js (TypeScript, App Router) — satu codebase untuk halaman publik, dashboard admin, dan API.
- **Realtime**: Socket.IO di atas custom Node.js server (dibungkus dengan Next.js) untuk komunikasi WebSocket; fallback ke polling otomatis oleh Socket.IO bila WebSocket diblokir jaringan.
- **Database**: PostgreSQL (via Prisma ORM) — SQLite untuk mode pengembangan lokal.
- **Autentikasi**: Session/JWT berbasis cookie untuk admin.
- **Notifikasi WhatsApp**: Adapter service (interface `WhatsAppProvider`) dengan implementasi default ke provider pihak ketiga (mis. Fonnte API); mode `mock`/log untuk pengembangan tanpa kredensial nyata.
- **Deployment target**: Node.js server (VPS/Container) karena membutuhkan koneksi WebSocket persisten — bukan platform serverless murni.

### 8.1 Entitas Data Utama

- `Clinic` — data klinik (nama, timezone, jam operasional).
- `Service` (Poli/Layanan) — nama, prefix nomor antrean.
- `Counter` (Loket) — loket fisik yang terhubung ke satu atau lebih Service.
- `QueueEntry` — nomor antrean: service, nomor urut, nama pasien, no. WA, status, timestamp tiap perubahan status.
- `AdminUser` — akun petugas/superadmin, role.
- `NotificationLog` — riwayat pengiriman notifikasi WA (tujuan, jenis trigger, status, payload).

## 9. Kriteria Penerimaan (Acceptance Criteria) — MVP

- [ ] Pasien dapat mengambil nomor antrean untuk minimal 2 poli berbeda dan menerima nomor unik yang benar formatnya.
- [ ] Petugas dapat login, memanggil, melewati, dan menyelesaikan antrean dari dashboard.
- [ ] Layar antrean publik menampilkan perubahan nomor yang dipanggil tanpa reload halaman.
- [ ] Notifikasi WhatsApp terkirim (atau tercatat di log bila mode mock) pada ketiga trigger yang ditentukan.
- [ ] Statistik dasar (total dilayani, rata-rata waktu tunggu) tampil di dashboard superadmin.
- [ ] Nomor antrean reset otomatis pada hari berikutnya.

## 10. Roadmap Implementasi (Milestone)

| # | Milestone | Output |
|---|---|---|
| 1 | PRD & perencanaan | Dokumen ini |
| 2 | Scaffold proyek + schema database | Struktur project, Prisma schema, migrasi awal |
| 3 | Backend realtime (Socket.IO) + API manajemen antrean | Endpoint CRUD antrean & event realtime |
| 4 | Halaman Layar Antrean (Display) | Halaman publik realtime + audio panggilan |
| 5 | Dashboard Admin | Login, kelola antrean per loket, master data |
| 6 | Halaman ambil nomor antrean (kiosk) | Form ambil nomor + tampilan status pasien |
| 7 | Integrasi notifikasi WhatsApp | Adapter provider WA + trigger otomatis |
| 8 | Statistik & laporan dasar | Dashboard ringkasan harian |
| 9 | Dokumentasi README & panduan deployment | README lengkap |

## 11. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Provider WhatsApp pihak ketiga berbayar/butuh approval | Notifikasi tidak jalan di lingkungan dev | Sediakan mode `mock` provider untuk development & testing |
| WebSocket diblokir firewall jaringan klinik | Layar tidak update realtime | Socket.IO fallback ke long-polling secara otomatis |
| Petugas lupa reset/loket ganda memanggil nomor sama | Antrean kacau | Lock status di level database (transaksi) saat mengubah status antrean |
| Beban tinggi saat jam sibuk (banyak pasien ambil nomor bersamaan) | Nomor antrean duplikat/race condition | Penomoran dilakukan via transaksi database dengan penguncian baris (row lock) per Service per hari |

---

*Dokumen ini adalah acuan awal (living document) dan akan diperbarui seiring implementasi berjalan.*
