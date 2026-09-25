import type { WhatsAppProvider, WhatsAppSendResult } from "../types";

/**
 * Provider berbasis Fonnte (https://fonnte.com) — salah satu layanan gateway
 * WhatsApp populer di Indonesia yang punya mode sandbox/trial. Butuh
 * WA_FONNTE_TOKEN di environment. Provider lain bisa ditambahkan dengan pola
 * yang sama tanpa mengubah kode di luar folder ini.
 */
export class FonnteWhatsAppProvider implements WhatsAppProvider {
  readonly name = "fonnte";

  constructor(
    private readonly token: string,
    private readonly baseUrl: string = "https://api.fonnte.com/send",
  ) {}

  async sendMessage(phone: string, message: string): Promise<WhatsAppSendResult> {
    if (!this.token) {
      return { ok: false, info: "WA_FONNTE_TOKEN belum diisi" };
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: this.token,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          target: normalizePhone(phone),
          message,
        }),
      });

      const body = await response.text();

      if (!response.ok) {
        return { ok: false, info: `HTTP ${response.status}: ${body}` };
      }

      return { ok: true, info: body };
    } catch (error) {
      return {
        ok: false,
        info: error instanceof Error ? error.message : "unknown error",
      };
    }
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }
  return digits;
}
