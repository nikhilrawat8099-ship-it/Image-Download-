# 100% Live Image, Thumbnail & Interactive Wallpaper Fix

A comprehensive reliability and visual architecture plan to eliminate broken images, failed thumbnails, and invisible photos across Lumina Wallpapers, guaranteeing 100% live rendering through a robust server image proxy, resilient fallback fall-throughs, and interactive live wallpaper previews.

### User Review & Critical Decisions

> [!IMPORTANT]
> The primary cause of missing images is third-party hotlink blocking (HTTP 403 / CORS) from scraped web sources, combined with an aggressive failure handler that permanently hid cards (`return null`). We are resolving this with a server-side image proxy, resilient multi-stage fallback cascades, and verified high-resolution backup assets.

- **Image Proxy Architecture**: All external image requests that encounter CORS or hotlink restrictions will route through `/api/image-proxy?url=...` with automatic User-Agent and spoofed referrers, ensuring images always render live.
- **Zero-Drop Card Policy**: Cards will no longer disappear when an image URL encounters network friction. Instead, they cascade gracefully: Thumbnail → Direct Full Res → Server Proxy → Curated Backup Wallpaper, preserving the full grid layout without sudden shifts.
- **Enhanced Live Capabilities**: Adding interactive Live Motion wallpaper previews, real-time live clock/date synchronization on lock screen preview, and instant visual shader filters.

---

### 1. Overview & Core Concept

- **What It Does**: Resolves all non-displaying thumbnails, broken image links, and missing assets across the Home, Trending, Latest Uploads, and Search sections. Guarantees that every wallpaper card displays a crisp, live thumbnail and opens into a full-resolution preview without loading failures.
- **Target Audience / Persona**: Mobile personalization enthusiasts, digital art collectors, and OLED/4K display owners seeking a buttery-smooth wallpaper discovery and customization app.
- **Key Value**: 100% reliable image loading, zero missing cards, instant visual feedback, and rich live wallpaper simulation tools.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Browse & Discover*: Users open Home, Latest, or Search; all thumbnails render immediately in high definition without broken image icons or collapsed blank spaces.
  2. *Live Inspection*: Tapping any wallpaper card smoothly reveals the full-screen inspection modal with live resolution badges, real-time photo metadata, and instant download options.
  3. *Live Phone Simulation*: Tapping the "Live Lockscreen Preview" button displays a live working clock with real-time seconds, flashlight toggle effect, and device notch simulation.
  4. *Live Motion Wallpapers*: A dedicated toggle/filter for dynamic motion and live ambient backgrounds with interactive drag and tilt effects.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Refined mobile-first dark slate palette with crisp typography, subtle elevation, and edge-to-edge photography.
  - *Color Palette & Tokens*: Neutral canvas (`#121212` dark / `#fafafa` light), structural surfaces (`#1e1e1e` / `#ffffff`), and high-intent emerald & gold badges for verified 4K resolution.
  - *Typography*: Clean neo-grotesque type hierarchy with tabular figures (`tabular-nums`) for image dimensions, file sizes, and download metrics.
- **Interactive Feedback & Motion**:
  - Soft skeleton placeholder with gentle shimmer pulse while images decode.
  - Smooth 200ms cross-fade when switching from proxy thumbnail to high-res master.
  - Haptic-feel double tap heart burst animation.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server Image Proxy vs. Direct Browser Fetch**
  - *Chosen Approach*: Implement a streaming `/api/image-proxy` endpoint on the Express server that strips restrictive referrer headers and streams image buffers with optimal cache headers.
  - *Why*: Eliminates 403 Forbidden errors caused by external sites blocking browser hotlinking.
  - *Alternatives Considered*: Client-side `referrerPolicy="no-referrer"` alone fails for hosts requiring specific User-Agent headers.
- **Decision 2: Multi-Tier Fallback Cascade vs. Silent Card Drop**
  - *Chosen Approach*: Multi-tier cascade: `Thumbnail URL` → `Full Resolution URL` → `/api/image-proxy` → `Curated 4K High-Res Backup Asset`.
  - *Why*: Prevents layout jumps, preserves scroll position, and guarantees zero blank cards.
  - *Alternatives Considered*: Dropping cards (`return null`) caused unpredictable gaps and missing results.
- **Decision 3: Dedicated Live Motion Section**
  - *Chosen Approach*: Introduce a curated set of interactive live/animated video wallpapers and animated gradient canvases in the category bar.
  - *Why*: Directly satisfies user interest in "live" wallpapers and motion backgrounds.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       Client View                           │
│  (Home / Latest / Search Grid / Modal Preview / Live Sim)   │
└──────────────┬──────────────────────────────▲───────────────┘
               │ 1. Request Images            │ 4. Verified Image Stream
               ▼                              │
┌─────────────────────────────────────────────┴───────────────┐
│                      Express Backend                        │
│                                                             │
│   ┌────────────────────────┐    ┌────────────────────────┐  │
│   │   /api/search-images   │    │   /api/image-proxy     │  │
│   │   (Bing + Wallhaven)   │    │   (CORS & Header Spoof)│  │
│   └───────────┬────────────┘    └───────────┬────────────┘  │
│               │                             │               │
│   ┌───────────▼────────────┐    ┌───────────▼────────────┐  │
│   │  In-Memory Fast Cache  │    │ Fallback Curated Vault │  │
│   └────────────────────────┘    └────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- **Endpoints**:
  - `GET /api/image-proxy?url=<encoded_url>`: Streams remote images with proper MIME type, caching headers (`max-age=86400`), and referrer masking.
  - `GET /api/search-images` & `GET /api/latest-uploads`: Returns sanitized image objects containing `url`, `thumbnail`, `proxyUrl`, `width`, `height`, and `isLive`.
- **Client Components**:
  - `WallpaperCard`: Memoized component with multi-stage fallback state machine, loading shimmer, and zero-drop guarantee.
  - `ImageModal`: Fullscreen inspection view with live simulated lockscreen, real-time clock, pan/zoom gesture handling, and client-side canvas filter export.
