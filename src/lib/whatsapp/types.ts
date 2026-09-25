export type WhatsAppSendResult = {
  ok: boolean;
  info?: string;
};

/**
 * Interface adapter provider WhatsApp. Implementasi konkret (Fonnte, Wablas,
 * WA Cloud API resmi, dll.) tinggal mengikuti kontrak ini agar logika antrean
 * tidak perlu tahu detail provider yang dipakai.
 */
export interface WhatsAppProvider {
  readonly name: string;
  sendMessage(phone: string, message: string): Promise<WhatsAppSendResult>;
}
