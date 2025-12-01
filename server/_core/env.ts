export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  // Support both DATABASE_URL and MYSQL_URL (Railway uses MYSQL_URL)
  databaseUrl: process.env.DATABASE_URL ?? process.env.MYSQL_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Cloudflare R2 Configuration
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
  cloudflareBucket: process.env.CLOUDFLARE_R2_BUCKET ?? "",
  cloudflareAccessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "",
  cloudflareSecretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "",
  cloudflarePublicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL ?? "", // Optional: Custom domain or R2.dev URL
  // Google OAuth Configuration
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",
};
