import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../../server/db";
import { getSessionCookieOptions } from "./cookies";
import { createSessionToken } from "./auth";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Register Google OAuth routes
 */
export function registerOAuthRoutes(app: Express) {
  // OAuth login initiation
  app.get("/api/oauth/login", async (req: Request, res: Response) => {
    const { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } = process.env;
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
      res.status(500).json({ error: "Google OAuth not configured" });
      return;
    }

    const redirectUri = GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/oauth/callback`;
    const state = Buffer.from(JSON.stringify({ redirectUri })).toString("base64");
    
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");

    res.redirect(302, authUrl.toString());
  });

  // OAuth callback handler
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code) {
      res.status(400).json({ error: "Authorization code is required" });
      return;
    }

    try {
      // Exchange code for access token
      const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
      
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        throw new Error("Google OAuth not configured");
      }

      const redirectUri = GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/oauth/callback`;

      // Exchange authorization code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokens = await tokenResponse.json();
      const { access_token } = tokens;

      // Get user info from Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error("Failed to get user info from Google");
      }

      const userInfo = await userInfoResponse.json();
      const { id: googleId, email, name, picture } = userInfo;

      if (!googleId || !email) {
        res.status(400).json({ error: "Invalid user info from Google" });
        return;
      }

      // Use Google ID as openId
      const openId = `google_${googleId}`;

      // Upsert user in database
      await db.upsertUser({
        openId,
        name: name || null,
        email: email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await createSessionToken(openId, {
        name: name || email || "User",
        expiresInMs: ONE_YEAR_MS,
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to home
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
