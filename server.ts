import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import cors from "cors";
import google from "googlethis";
import { image_search } from "duckduckgo-images-api";
import gis from "g-i-s";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // In-memory cache for ultra-fast response times & zero lag
  interface CacheEntry {
    timestamp: number;
    data: any;
  }
  const apiCache = new Map<string, CacheEntry>();
  const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

  function getCached(key: string) {
    const entry = apiCache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
    if (entry) apiCache.delete(key);
    return null;
  }

  function setCached(key: string, data: any) {
    if (apiCache.size > 250) {
      const oldestKey = apiCache.keys().next().value;
      if (oldestKey) apiCache.delete(oldestKey);
    }
    apiCache.set(key, { timestamp: Date.now(), data });
  }

  const LIVE_MOTION_WALLPAPERS = [
    {
      url: "https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-streets-in-the-rain-42589-large.mp4",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-streets-in-the-rain-42589-large.mp4",
      thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=720&q=80",
      title: "Neon Rain Cyberpunk Live",
      source: "https://mixkit.co",
      width: 2160,
      height: 3840,
      badge: "LIVE 4K",
      isNew: true,
      isLive: true,
      isVideo: true
    },
    {
      url: "https://assets.mixkit.co/videos/preview/mixkit-abstract-purple-and-blue-liquid-waves-42618-large.mp4",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-abstract-purple-and-blue-liquid-waves-42618-large.mp4",
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=720&q=80",
      title: "Fluid Cosmic Waves Live",
      source: "https://mixkit.co",
      width: 2160,
      height: 3840,
      badge: "LIVE 4K",
      isNew: true,
      isLive: true,
      isVideo: true
    },
    {
      url: "https://assets.mixkit.co/videos/preview/mixkit-waterfall-in-forest-2213-large.mp4",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-waterfall-in-forest-2213-large.mp4",
      thumbnail: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=720&q=80",
      title: "Emerald Forest Waterfall Live",
      source: "https://mixkit.co",
      width: 1920,
      height: 1080,
      badge: "LIVE HD",
      isNew: true,
      isLive: true,
      isVideo: true
    },
    {
      url: "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1610-large.mp4",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1610-large.mp4",
      thumbnail: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=720&q=80",
      title: "Deep Space Stars Flight Live",
      source: "https://mixkit.co",
      width: 3840,
      height: 2160,
      badge: "LIVE 4K",
      isNew: true,
      isLive: true,
      isVideo: true
    },
    {
      url: "https://assets.mixkit.co/videos/preview/mixkit-sunset-over-the-sea-1180-large.mp4",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-sunset-over-the-sea-1180-large.mp4",
      thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=720&q=80",
      title: "Golden Hour Ocean Horizon Live",
      source: "https://mixkit.co",
      width: 1920,
      height: 1080,
      badge: "LIVE HD",
      isNew: true,
      isLive: true,
      isVideo: true
    },
    {
      url: "https://assets.mixkit.co/videos/preview/mixkit-driving-on-a-highway-at-night-41584-large.mp4",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-driving-on-a-highway-at-night-41584-large.mp4",
      thumbnail: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=720&q=80",
      title: "Night Highway Supercar Drift Live",
      source: "https://mixkit.co",
      width: 2160,
      height: 3840,
      badge: "LIVE 4K",
      isNew: true,
      isLive: true,
      isVideo: true
    }
  ];

  app.get("/api/search-images", async (req, res) => {
    try {
      const query = (req.query.q as string || "").trim();
      const safeParam = req.query.safe;
      const hqParam = req.query.hq;
      const pageParam = req.query.page;
      const sortParam = (req.query.sort as string || "latest").toLowerCase();
      const isSafe = safeParam === "true";
      const isHQ = hqParam === "true";
      const pageNum = parseInt((pageParam as string) || "1", 10) || 1;
      
      const searchQuery = query || "latest best mobile wallpapers 4k";
      const cacheKey = `search:${searchQuery}:${sortParam}:${pageNum}:${isSafe}:${isHQ}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // If user specifically requests "live" wallpapers or sortParam is "live"
      const isLiveQuery = searchQuery.toLowerCase().includes("live") || sortParam === "live";
      if (isLiveQuery && pageNum === 1) {
        const payload = {
          results: LIVE_MOTION_WALLPAPERS,
          total: LIVE_MOTION_WALLPAPERS.length,
          page: 1
        };
        setCached(cacheKey, payload);
        return res.json(payload);
      }

      // Parallel execution for multiple sources: Bing Web Search + Wallhaven Live Community Uploads
      const fetchBing = async () => {
        const bingList: Array<{ url: string; title: string; source: string; thumbnail: string; width: number; height: number; badge?: string; isNew?: boolean }> = [];
        try {
          let bQuery = searchQuery;
          if (sortParam === "latest" && !bQuery.toLowerCase().includes("latest") && !bQuery.toLowerCase().includes("new")) {
            bQuery += " latest new uploads 2025 2026";
          }
          if (isHQ && !bQuery.toLowerCase().includes("4k") && !bQuery.toLowerCase().includes("hd") && !bQuery.toLowerCase().includes("wallpaper")) {
            bQuery += " 4k wallpaper";
          }

          const first = (pageNum - 1) * 35 + 1;
          const adlt = isSafe ? "strict" : "off";
          const bingUrl = `https://www.bing.com/images/async?q=${encodeURIComponent(bQuery)}&first=${first}&count=35&mkt=en-US&adlt=${adlt}`;

          const response = await fetch(bingUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9"
            }
          });

          if (response.ok) {
            const html = await response.text();
            const $ = cheerio.load(html);

            $(".iusc").each((_, el) => {
              try {
                const rawM = $(el).attr("m");
                if (!rawM) return;
                const mData = JSON.parse(rawM);
                if (mData.murl && typeof mData.murl === "string" && !mData.murl.startsWith("data:")) {
                  bingList.push({
                    url: mData.murl,
                    title: mData.t || `${searchQuery} Wallpaper`,
                    source: mData.purl || mData.murl,
                    thumbnail: mData.turl || mData.murl,
                    width: mData.w || 0,
                    height: mData.h || 0,
                    badge: "Web",
                    isNew: false
                  });
                }
              } catch (parseErr) {}
            });
          }
        } catch (e) {
          console.warn("Bing images async search failed:", e);
        }
        return bingList;
      };

      const fetchWallhaven = async () => {
        const whList: Array<{ url: string; title: string; source: string; thumbnail: string; width: number; height: number; badge?: string; isNew?: boolean }> = [];
        try {
          let whSorting = sortParam === "trending" ? "toplist" : "date_added";
          let whUrl = `https://wallhaven.cc/api/v1/search?sorting=${whSorting}&order=desc&page=${pageNum}`;
          
          const isGenericDefault = !query || query.includes("latest best mobile wallpapers 4k") || query.includes("trending popular wallpapers");
          if (!isGenericDefault) {
            whUrl = `https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(query)}&sorting=${whSorting}&order=desc&page=${pageNum}`;
          }

          const whRes = await fetch(whUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
          });

          if (whRes.ok) {
            const data = await whRes.json();
            if (data && Array.isArray(data.data)) {
              for (const item of data.data) {
                if (item && item.path) {
                  whList.push({
                    url: item.path,
                    title: item.tags && item.tags.length > 0 ? item.tags.map((t: any) => t.name).join(" ") : `${query || 'Wallpaper'} ${item.id}`,
                    source: item.url || item.path,
                    thumbnail: item.thumbs?.small || item.thumbs?.large || item.path,
                    width: item.dimension_x || 0,
                    height: item.dimension_y || 0,
                    badge: "NEW",
                    isNew: true
                  });
                }
              }
            }
          }
        } catch (whErr) {
          console.warn("Wallhaven search failed:", whErr);
        }
        return whList;
      };

      // Run both in parallel
      const [bingResults, wallhavenResults] = await Promise.all([fetchBing(), fetchWallhaven()]);

      // Interleave results so fresh uploads and live web images are evenly blended
      const combined: Array<{ url: string; title: string; source: string; thumbnail: string; width: number; height: number; badge?: string; isNew?: boolean }> = [];
      const maxLen = Math.max(bingResults.length, wallhavenResults.length);
      const seenUrls = new Set<string>();

      for (let i = 0; i < maxLen; i++) {
        if (i < wallhavenResults.length) {
          const item = wallhavenResults[i];
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            combined.push(item);
          }
        }
        if (i < bingResults.length) {
          const item = bingResults[i];
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            combined.push(item);
          }
        }
      }

      // Fallback to Openverse if both returned nothing
      if (combined.length === 0) {
        try {
          const openverseRes = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(searchQuery)}&page=${pageNum}&page_size=25`, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
          });
          if (openverseRes.ok) {
            const data = await openverseRes.json();
            if (data && Array.isArray(data.results)) {
              for (const item of data.results) {
                if (item.url && !seenUrls.has(item.url)) {
                  seenUrls.add(item.url);
                  combined.push({
                    url: item.url,
                    title: item.title || `${searchQuery} Wallpaper`,
                    source: item.foreign_landing_url || item.url,
                    thumbnail: item.thumbnail || item.url,
                    width: item.width || 0,
                    height: item.height || 0,
                    badge: "Web",
                    isNew: false
                  });
                }
              }
            }
          }
        } catch (ovErr) {
          console.warn("Openverse fallback search failed:", ovErr);
        }
      }

      const responsePayload = { results: combined, total: combined.length, page: pageNum };
      if (combined.length > 0) {
        setCached(cacheKey, responsePayload);
      }
      res.json(responsePayload);
    } catch (e: any) {
      console.error("Image search error:", e);
      res.status(500).json({ error: e.message || "Search failed" });
    }
  });

  // Dedicated endpoint for newly uploaded internet wallpapers
  app.get("/api/latest-uploads", async (req, res) => {
    try {
      const pageParam = req.query.page;
      const pageNum = parseInt((pageParam as string) || "1", 10) || 1;

      const cacheKey = `latest:${pageNum}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const whRes = await fetch(`https://wallhaven.cc/api/v1/search?sorting=date_added&order=desc&page=${pageNum}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });

      let items: any[] = [];
      if (whRes.ok) {
        const data = await whRes.json();
        if (data && Array.isArray(data.data)) {
          items = data.data.map((item: any) => ({
            url: item.path,
            title: item.tags && item.tags.length > 0 ? item.tags.map((t: any) => t.name).join(" ") : `New Wallpaper ${item.id}`,
            source: item.url || item.path,
            thumbnail: item.thumbs?.small || item.thumbs?.large || item.path,
            width: item.dimension_x || 0,
            height: item.dimension_y || 0,
            badge: "NEW",
            isNew: true
          }));
        }
      }

      const responsePayload = { results: items, page: pageNum };
      if (items.length > 0) {
        setCached(cacheKey, responsePayload);
      }
      res.json(responsePayload);
    } catch (err: any) {
      console.error("Latest uploads error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch latest uploads" });
    }
  });

  // High-performance image streaming proxy to eliminate hotlink blocks (403), CORS, and broken external thumbnails
  app.get("/api/image-proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("Image URL is required");
    }

    try {
      new URL(targetUrl);
    } catch {
      return res.status(400).send("Invalid URL");
    }

    const cacheKey = `proxy:${targetUrl}`;
    const cached = getCached(cacheKey);
    if (cached && cached.buffer && cached.contentType) {
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      return res.send(Buffer.from(cached.buffer, "base64"));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const upstream = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Referer": "https://www.bing.com/",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (upstream.ok) {
        const contentType = upstream.headers.get("content-type") || "image/jpeg";
        const arrayBuf = await upstream.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);

        if (buffer.length < 800000) {
          setCached(cacheKey, { contentType, buffer: buffer.toString("base64") });
        }

        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
        return res.send(buffer);
      }
    } catch (e) {
      clearTimeout(timeoutId);
    }

    // Curated high-res verified backup vertical wallpapers if upstream server blocks or fails
    const backupWallpapers = [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80",
      "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1080&q=80",
      "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1080&q=80",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1080&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80",
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1080&q=80",
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1080&q=80",
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1080&q=80"
    ];
    let hash = 0;
    for (let i = 0; i < targetUrl.length; i++) {
      hash = (hash << 5) - hash + targetUrl.charCodeAt(i);
      hash |= 0;
    }
    const fallback = backupWallpapers[Math.abs(hash) % backupWallpapers.length];
    return res.redirect(302, fallback);
  });

  app.get("/api/download", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).json({ error: "URL is required", message: "Download URL must be provided in the query parameters." });
    }

    // 1. Validate URL format
    try {
      new URL(imageUrl);
    } catch (urlErr) {
      return res.status(400).json({
        error: "Invalid URL Format",
        message: "The provided image URL is not formatted correctly or is not a valid absolute URL."
      });
    }

    // 2. Setup AbortController for fetch timeout (15 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      // Fetch the image from the remote URL with a signal
      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
          "Referer": "https://www.bing.com/"
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status >= 400 && response.status < 600 ? response.status : 502).json({
          error: "Upstream Server Error",
          message: `The remote image server responded with a failure status of ${response.status} (${response.statusText || 'Not Authorized/Error'}).`,
          status: response.status
        });
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
         res.setHeader("Content-Type", contentType);
      }

      // Read the response body as arrayBuffer and send it
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      res.send(buffer);
    } catch (e: any) {
      clearTimeout(timeoutId);
      console.error("Download proxy error:", e);
      
      // Handle AbortError / Timeout
      if (e.name === "AbortError" || e.code === "ETIMEDOUT") {
        return res.status(504).json({
          error: "Gateway Timeout",
          message: "The request to download the image timed out. The remote image host is taking too long to respond."
        });
      }

      // Handle DNS resolution failure
      if (e.code === "ENOTFOUND") {
        return res.status(404).json({
          error: "Host Not Found",
          message: "The domain name of the remote image could not be resolved. Please verify the URL host is active and correct."
        });
      }

      // Handle Connection Refused
      if (e.code === "ECONNREFUSED") {
        return res.status(502).json({
          error: "Connection Refused",
          message: "The remote image server refused the connection. The server may be offline or blocking our service requests."
        });
      }

      // General network/CORS issue
      return res.status(502).json({
        error: "Bad Gateway",
        message: "Failed to download the image due to a network error, SSL handshake failure, or remote CORS restriction.",
        details: e.message || String(e)
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
