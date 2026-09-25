import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";

type RequireSessionResult =
  | { session: SessionPayload }
  | { response: NextResponse };

/** Dipakai di awal setiap route handler admin untuk memastikan request sudah login. */
export async function requireSession(): Promise<RequireSessionResult> {
  const session = await getSession();
  if (!session) {
    return { response: NextResponse.json({ error: "Belum login" }, { status: 401 }) };
  }
  return { session };
}
