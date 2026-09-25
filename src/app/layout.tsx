import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistem Antrean Klinik Realtime",
  description:
    "Sistem antrean digital realtime untuk klinik: layar antrean, dashboard admin, dan notifikasi WhatsApp.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
