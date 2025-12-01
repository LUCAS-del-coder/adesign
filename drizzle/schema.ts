import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 原始廣告圖片表 - 存儲用戶上傳的成效好的廣告圖
 */
export const originalAds = mysqlTable("original_ads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  country: varchar("country", { length: 100 }), // 國家分類
  analysisPrompt: text("analysisPrompt"), // AI 分析後生成的提示詞
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OriginalAd = typeof originalAds.$inferSelect;
export type InsertOriginalAd = typeof originalAds.$inferInsert;

/**
 * 生成的廣告圖片表 - 存儲 AI 生成的變體圖片
 */
export const generatedAds = mysqlTable("generated_ads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  originalAdId: int("originalAdId").notNull(), // 關聯到原始廣告圖
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  prompt: text("prompt"), // 生成時使用的提示詞
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeneratedAd = typeof generatedAds.$inferSelect;
export type InsertGeneratedAd = typeof generatedAds.$inferInsert;

/**
 * Logo 區塊表 - 存儲用戶上傳的 logo，用於叠加到生成的圖片上
 */
export const logos = mysqlTable("logos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(), // Logo 名稱
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  enabled: int("enabled").default(0).notNull(), // 0 = 關閉, 1 = 開啟
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Logo = typeof logos.$inferSelect;
export type InsertLogo = typeof logos.$inferInsert;
