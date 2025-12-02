import type { Express, Request, Response } from "express";
import axios from "axios";
import { getGeneratedAdsByUserId } from "../db";
import { authenticateRequest } from "./auth";

/**
 * Register download proxy routes
 * These routes proxy image downloads from R2 to avoid CORS issues
 */
export function registerDownloadRoutes(app: Express) {
  // Download single image by ID
  app.get("/api/download/:id", async (req: Request, res: Response) => {
    try {
      // Authenticate user (throws error if not authenticated)
      let user;
      try {
        user = await authenticateRequest(req);
      } catch (authError) {
        console.error("[Download] Authentication failed:", authError);
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const imageId = parseInt(req.params.id);
      if (isNaN(imageId)) {
        res.status(400).json({ error: "Invalid image ID" });
        return;
      }

      // Get user's generated ads
      const generatedAds = await getGeneratedAdsByUserId(user.id);
      const ad = generatedAds.find(a => a.id === imageId);

      if (!ad) {
        res.status(404).json({ error: "Image not found" });
        return;
      }

      // Download image from R2
      const response = await axios.get(ad.fileUrl, {
        responseType: "stream",
        timeout: 30000,
      });

      // Set headers for download
      const filename = `generated-${ad.id}.png`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", response.headers["content-type"] || "image/png");
      res.setHeader("Content-Length", response.headers["content-length"] || "");

      // Pipe the image stream to response
      response.data.pipe(res);
    } catch (error) {
      console.error("[Download] Error:", error);
      res.status(500).json({ 
        error: "Download failed", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Download multiple images (batch download)
  app.post("/api/download/batch", async (req: Request, res: Response) => {
    try {
      // Authenticate user (throws error if not authenticated)
      let user;
      try {
        user = await authenticateRequest(req);
      } catch (authError) {
        console.error("[Download] Authentication failed:", authError);
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: "Invalid image IDs" });
        return;
      }

      // Get user's generated ads
      const generatedAds = await getGeneratedAdsByUserId(user.id);
      const validAds = generatedAds.filter(ad => ids.includes(ad.id));

      if (validAds.length === 0) {
        res.status(404).json({ error: "No valid images found" });
        return;
      }

      // For batch download, we'll return a JSON with download URLs
      // Frontend will handle sequential downloads
      const downloadUrls = validAds.map(ad => ({
        id: ad.id,
        url: `/api/download/${ad.id}`,
        filename: `generated-${ad.id}.png`
      }));

      res.json({ downloads: downloadUrls });
    } catch (error) {
      console.error("[Download] Batch error:", error);
      res.status(500).json({ 
        error: "Batch download failed", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
}

