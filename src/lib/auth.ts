import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "clinic_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 jam

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET belum diset di environment (.env)");
  }
  return secret;
}

export type SessionPayload = {
  sub: string;
  name: string;
  email: string;
  role: string;
  clinicId: string;
};

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: SESSION_MAX_AGE_SECONDS });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/** Membaca sesi admin dari cookie request saat ini (server component / route handler). */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function authenticateAdmin(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  return user;
}
