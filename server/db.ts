import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, originalAds, generatedAds, logos, InsertOriginalAd, InsertGeneratedAd, InsertLogo } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  // Support both DATABASE_URL and MYSQL_URL (Railway uses MYSQL_URL)
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (!_db && databaseUrl) {
    try {
      _db = drizzle(databaseUrl);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// 原始廣告圖片相關查詢
export async function createOriginalAd(ad: InsertOriginalAd) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(originalAds).values(ad);
  return result;
}

export async function getOriginalAdsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(originalAds).where(eq(originalAds.userId, userId)).orderBy(desc(originalAds.createdAt));
}

export async function getOriginalAdById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(originalAds).where(eq(originalAds.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateOriginalAdAnalysis(id: number, analysisPrompt: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(originalAds).set({ analysisPrompt }).where(eq(originalAds.id, id));
}

// 生成廣告圖片相關查詢
export async function createGeneratedAd(ad: InsertGeneratedAd) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(generatedAds).values(ad);
  return result;
}

export async function getGeneratedAdsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(generatedAds).where(eq(generatedAds.userId, userId)).orderBy(desc(generatedAds.createdAt));
}

export async function getGeneratedAdsByOriginalId(originalAdId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(generatedAds).where(eq(generatedAds.originalAdId, originalAdId)).orderBy(desc(generatedAds.createdAt));
}

// Logo 相關查詢
export async function createLogo(logo: InsertLogo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(logos).values(logo);
  return result;
}

export async function getLogosByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(logos).where(eq(logos.userId, userId)).orderBy(desc(logos.createdAt));
}

export async function updateLogoEnabled(id: number, enabled: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(logos).set({ enabled }).where(eq(logos.id, id));
}

export async function deleteLogo(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(logos).where(eq(logos.id, id));
}

export async function getEnabledLogosByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { and } = await import("drizzle-orm");
  return await db.select().from(logos).where(and(eq(logos.userId, userId), eq(logos.enabled, 1))).orderBy(desc(logos.createdAt));
}
