import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  openId: string;
  name: string;
};

function getSessionSecret() {
  const secret = ENV.cookieSecret;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Create a session token (JWT)
 */
export async function createSessionToken(
  openId: string,
  options: { expiresInMs?: number; name?: string } = {}
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({
    openId,
    name: options.name || "",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .setIssuedAt(Math.floor(issuedAt / 1000))
    .sign(secretKey);
}

/**
 * Verify a session token
 */
export async function verifySession(
  cookieValue: string | undefined | null
): Promise<{ openId: string; name: string } | null> {
  if (!cookieValue) {
    console.warn("[Auth] Missing session cookie");
    return null;
  }

  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(cookieValue, secretKey, {
      algorithms: ["HS256"],
    });
    const { openId, name } = payload as Record<string, unknown>;

    if (typeof openId !== "string" || openId.length === 0) {
      console.warn("[Auth] Session payload missing openId");
      return null;
    }

    return {
      openId,
      name: typeof name === "string" ? name : "",
    };
  } catch (error) {
    console.warn("[Auth] Session verification failed", String(error));
    return null;
  }
}

/**
 * Authenticate a request and return the user
 */
export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const sessionCookie = cookies[COOKIE_NAME];
  const session = await verifySession(sessionCookie);

  if (!session) {
    throw ForbiddenError("Invalid session cookie");
  }

  const sessionUserId = session.openId;
  const signedInAt = new Date();
  let user = await db.getUserByOpenId(sessionUserId);

  if (!user) {
    // User not found - this shouldn't happen if OAuth flow is correct
    throw ForbiddenError("User not found");
  }

  // Update last signed in time
  await db.upsertUser({
    openId: user.openId,
    lastSignedIn: signedInAt,
  });

  return user;
}

