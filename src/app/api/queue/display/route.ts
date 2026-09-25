import { NextResponse } from "next/server";
import { getDefaultClinic } from "@/lib/clinic";
import { getDisplayState } from "@/lib/queue-service";

// Data ini harus selalu realtime — jangan sampai Next.js meng-cache hasilnya
// sebagai halaman statis saat build.
export const dynamic = "force-dynamic";

export async function GET() {
  const clinic = await getDefaultClinic();
  const state = await getDisplayState(clinic.id);
  return NextResponse.json(state);
}
