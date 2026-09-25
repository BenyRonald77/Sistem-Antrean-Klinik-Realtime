import { prisma } from "@/lib/prisma";
import { NotificationStatus, NotificationType } from "@/lib/constants";
import type { WhatsAppProvider } from "./types";
import { MockWhatsAppProvider } from "./providers/mock-provider";
import { FonnteWhatsAppProvider } from "./providers/fonnte-provider";

function createProvider(): WhatsAppProvider {
  const kind = (process.env.WA_PROVIDER || "mock").toLowerCase();

  switch (kind) {
    case "fonnte":
      return new FonnteWhatsAppProvider(
        process.env.WA_FONNTE_TOKEN || "",
        process.env.WA_FONNTE_BASE_URL || "https://api.fonnte.com/send",
      );
    case "mock":
    default:
      return new MockWhatsAppProvider();
  }
}

let cachedProvider: WhatsAppProvider | undefined;

function getProvider(): WhatsAppProvider {
  if (!cachedProvider) {
    cachedProvider = createProvider();
  }
  return cachedProvider;
}

type NotifyParams = {
  queueEntryId: string;
  phone: string;
  message: string;
  type: (typeof NotificationType)[keyof typeof NotificationType];
};

/**
 * Kirim notifikasi WA lalu selalu catat hasilnya ke NotificationLog — sukses
 * maupun gagal. Kegagalan pengiriman WA sengaja tidak melempar error supaya
 * tidak menghentikan alur utama antrean (lihat FR-12 di PRD).
 */
export async function sendQueueNotification({
  queueEntryId,
  phone,
  message,
  type,
}: NotifyParams): Promise<void> {
  const provider = getProvider();
  const result = await provider.sendMessage(phone, message);

  await prisma.notificationLog.create({
    data: {
      queueEntryId,
      type,
      phone,
      status: result.ok ? NotificationStatus.SENT : NotificationStatus.FAILED,
      providerName: provider.name,
      responseInfo: result.info,
    },
  });
}

export function buildIssuedMessage(code: string, serviceName: string, position: number) {
  return `Nomor antrean Anda: *${code}* untuk ${serviceName}.\nAda ${position} antrean di depan Anda. Kami akan mengirim kabar saat giliran Anda mendekat.`;
}

export function buildAlmostTurnMessage(code: string, serviceName: string, remaining: number) {
  return `Nomor antrean *${code}* (${serviceName}): sisa ${remaining} antrean lagi sebelum giliran Anda. Mohon bersiap menuju klinik.`;
}

export function buildCalledMessage(code: string, serviceName: string, counterName: string) {
  return `Nomor antrean *${code}* (${serviceName}) sedang dipanggil ke *${counterName}*. Silakan menuju loket sekarang.`;
}
