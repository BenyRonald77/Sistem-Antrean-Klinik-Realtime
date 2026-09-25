import type { Server as IOServer } from "socket.io";

// Socket.IO server hanya bisa dibuat sekali oleh custom server (server/index.ts).
// API routes (berjalan di process Node yang sama karena custom server) mengakses
// instance yang sama lewat singleton global ini untuk broadcast event realtime.
const globalForIO = globalThis as unknown as { __io?: IOServer };

export function setIO(io: IOServer) {
  globalForIO.__io = io;
}

export function getIO(): IOServer | undefined {
  return globalForIO.__io;
}

export const RealtimeEvent = {
  QUEUE_UPDATED: "queue:updated",
  QUEUE_CALLED: "queue:called",
} as const;

export type QueueUpdatedPayload = {
  clinicId: string;
  serviceId: string;
};

export type QueueCalledPayload = {
  clinicId: string;
  serviceId: string;
  serviceName: string;
  counterName: string;
  code: string;
  patientName: string;
};

/**
 * Dipanggil setiap kali status antrean berubah (ambil nomor, panggil, skip, selesai).
 * Client (layar antrean & dashboard) cukup subscribe event ini lalu refetch data
 * terbaru — payload sengaja ringkas supaya kompatibel walau bentuk data berkembang.
 */
export function broadcastQueueUpdated(payload: QueueUpdatedPayload) {
  getIO()?.emit(RealtimeEvent.QUEUE_UPDATED, payload);
}

/**
 * Dipakai khusus saat petugas memanggil nomor, agar layar antrean bisa langsung
 * menampilkan animasi + memutar audio panggilan tanpa menunggu refetch.
 */
export function broadcastQueueCalled(payload: QueueCalledPayload) {
  getIO()?.emit(RealtimeEvent.QUEUE_CALLED, payload);
}
