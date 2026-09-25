import type { WhatsAppProvider, WhatsAppSendResult } from "../types";

/**
 * Provider default untuk development/testing: tidak mengirim WA sungguhan,
 * hanya mencatat pesan ke console (dan tetap dicatat ke NotificationLog oleh
 * pemanggilnya). Aktif saat WA_PROVIDER=mock (default di .env.example).
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "mock";

  async sendMessage(phone: string, message: string): Promise<WhatsAppSendResult> {
    console.log(`[WA:mock] -> ${phone}: ${message}`);
    return { ok: true, info: "mock-sent" };
  }
}
