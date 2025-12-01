import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";

// Lazy load vite config to avoid import.meta.dirname issues in production bundle
// In production, we don't need vite config since we use static files
async function getViteConfig() {
  // In production, NEVER import vite.config.ts as it uses import.meta.dirname
  // which doesn't work in bundled code
  if (process.env.NODE_ENV !== "development") {
    return {
      plugins: [],
      resolve: { alias: {} },
      root: path.resolve(process.cwd(), "client"),
      publicDir: path.resolve(process.cwd(), "client", "public"),
    };
  }
  
  // Only in development, try to import vite.config
  // Use dynamic import with try-catch to prevent esbuild from analyzing
  try {
    // Construct path at runtime to prevent static analysis
    const parts = ["..", "..", "vite.config.js"];
    const configPath = parts.join("/");
    // Dynamic import - esbuild should not analyze this if we're careful
    const configModule = await import(/* @vite-ignore */ configPath);
    return configModule.default || configModule;
  } catch (error) {
    // If import fails (e.g., in production bundle), use fallback
    console.warn("[Vite] Failed to load vite.config, using defaults");
    return {
      plugins: [],
      resolve: { alias: {} },
      root: path.resolve(process.cwd(), "client"),
      publicDir: path.resolve(process.cwd(), "client", "public"),
    };
  }
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const config = await getViteConfig();
  const vite = await createViteServer({
    ...config,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // In production (bundled), import.meta.dirname may not be available
      // Always use process.cwd() for reliability
      const clientTemplate = path.resolve(process.cwd(), "client", "index.html");

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production (bundled), import.meta.dirname may not be available
  // Use process.cwd() which is reliable in all environments
  // In production (bundled), import.meta.dirname is not available
  // Always use process.cwd() which is reliable in all environments
  const possiblePaths = [
    // Try process.cwd() first (most reliable in production/bundled code)
    path.resolve(process.cwd(), "dist", "public"),
    // Try alternative paths
    path.resolve(process.cwd(), "public"),
  ];

  let distPath: string | null = null;
  
  for (const testPath of possiblePaths) {
    if (testPath && fs.existsSync(testPath)) {
      distPath = testPath;
      console.log(`[Static] Using path: ${distPath}`);
      break;
    }
  }

  if (!distPath) {
    // Default to process.cwd()/dist/public even if it doesn't exist
    // This prevents the path.resolve error
    distPath = path.resolve(process.cwd(), "dist", "public");
    console.error(
      `[Static] Could not find the build directory. Tried: ${possiblePaths.filter(p => p).join(", ")}`
    );
    console.error(
      `[Static] Current working directory: ${process.cwd()}`
    );
    console.error(
      `[Static] Using default path: ${distPath} (may not exist)`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath!, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Not found: index.html");
    }
  });
}
