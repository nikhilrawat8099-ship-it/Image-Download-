import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { Download, Search, Loader2, Image as ImageIcon, X, Home, Compass as CompassIcon, ChevronLeft, Settings, Moon, LayoutGrid, Heart, History, Sparkles, RefreshCw, Radio, Smartphone, Trash2, Info, Flashlight, Camera, Share2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ImageData {
  url: string;
  title: string;
  source: string;
  thumbnail: string;
  width?: number;
  height?: number;
  badge?: string;
  isNew?: boolean;
  isLive?: boolean;
  isVideo?: boolean;
  videoUrl?: string;
}

const FALLBACK_WALLPAPERS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1080&q=80",
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1080&q=80",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1080&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1080&q=80",
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1080&q=80",
  "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1080&q=80"
];

const CATEGORY_ITEMS = [
  { id: "all", name: "All", label: "✨ All" },
  { id: "live", name: "live motion wallpapers video", label: "🔴 Live Wallpapers" },
  { id: "nature", name: "Nature 4k mobile", label: "🌿 Nature" },
  { id: "amoled", name: "Dark Amoled 4k", label: "🖤 AMOLED" },
  { id: "anime", name: "Anime 4k aesthetic", label: "⚡ Anime" },
  { id: "cyberpunk", name: "Cyberpunk neon city", label: "🌆 Cyberpunk" },
  { id: "cars", name: "Supercars 4k racing", label: "🏎️ Cars" },
  { id: "space", name: "Deep Space galaxy cosmic", label: "🌌 Space" },
  { id: "gaming", name: "Gaming 4k wallpaper", label: "🎮 Gaming" },
  { id: "abstract", name: "Abstract fluid 4k", label: "🎨 Abstract" },
  { id: "animals", name: "Wild animals photography", label: "🐾 Animals" },
  { id: "minimal", name: "Minimalist aesthetic", label: "☕ Minimal" }
];

const AUTOCOMPLETE_SUGGESTIONS = [
  "Amoled Dark Vector",
  "Anime Wallpapers 4K",
  "Aurora Lights 4K",
  "Abstract Fluid Acrylic",
  "Batman Dark Knight",
  "BMW M4 Wallpapers",
  "Cars Supercars Racing 4K",
  "Cyberpunk Tokyo Neon Lights",
  "City Aesthetic Rainy Night",
  "Deep Space Cosmic Galaxy",
  "Demon Slayer Aesthetic",
  "Fantasy Magical Forests",
  "Forest Misty Vibe",
  "Gaming Neon Setup",
  "Goku Ultra Instinct",
  "Inspirational Lettering Quotes",
  "Marvel Avengers Spiderman",
  "Minimalist Nature Peak",
  "Naruto Shippuden HD",
  "Noir Aesthetic City Fog",
  "Pastel Clouds Sunset Beach",
  "Porsche 911 GT3 RS",
  "Retro Synthwave Sunset Grid",
  "Symmetric Architectural Art",
  "Tesla Cyberbeast 4K",
  "Vintage Film Aesthetics",
  "Vaporwave Computer Windows",
  "Zen Lotus Stones Calm"
];

export default function App() {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mobiwall_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = (searchWord: string) => {
    const term = searchWord.trim();
    if (!term) return;
    setHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== term.toLowerCase());
      const next = [term, ...filtered].slice(0, 8);
      localStorage.setItem('mobiwall_search_history', JSON.stringify(next));
      return next;
    });
  };

  const removeFromHistory = (e: React.MouseEvent, keyword: string) => {
    e.stopPropagation();
    setHistory(prev => {
      const next = prev.filter(h => h !== keyword);
      localStorage.setItem('mobiwall_search_history', JSON.stringify(next));
      return next;
    });
  };

  const handleSuggestionClick = (keyword: string) => {
    setQuery(keyword);
    setCurrentSearch(keyword);
    addToHistory(keyword);
    setPreviousTab(activeTab);
    setActiveTab("search");
    setIsSearching(false);
  };

  const filteredSuggestions = query.trim() 
    ? AUTOCOMPLETE_SUGGESTIONS.filter(item => 
        item.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : AUTOCOMPLETE_SUGGESTIONS.slice(0, 8);

  const [activeTab, setActiveTab] = useState<'latest' | 'home' | 'trending' | 'search' | 'favorites' | 'downloads' | 'settings'>(() => {
    try {
      return (localStorage.getItem('mobiwall_startTab') as any) || 'latest';
    } catch {
      return 'latest';
    }
  });

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [feedToast, setFeedToast] = useState("");

  // Latest Fresh Uploads state
  const [latestImages, setLatestImages] = useState<ImageData[]>([]);
  const [latestLoading, setLatestLoading] = useState(false);
  const [latestLoadingMore, setLatestLoadingMore] = useState(false);
  const [latestPage, setLatestPage] = useState(1);
  const [latestError, setLatestError] = useState("");

  // Home (For You) state
  const [homeImages, setHomeImages] = useState<ImageData[]>([]);
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeLoadingMore, setHomeLoadingMore] = useState(false);
  const [homePage, setHomePage] = useState(1);
  const [homeError, setHomeError] = useState("");
  const homeSearch = "latest best mobile wallpapers 4k";

  // Trending state
  const [trendingImages, setTrendingImages] = useState<ImageData[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingLoadingMore, setTrendingLoadingMore] = useState(false);
  const [trendingPage, setTrendingPage] = useState(1);
  const [trendingError, setTrendingError] = useState("");
  const trendingSearch = "trending popular wallpapers 4k";

  // Search state
  const [searchImages, setSearchImages] = useState<ImageData[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchError, setSearchError] = useState("");
  const [currentSearch, setCurrentSearch] = useState("");

  const isMountedRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const scrollThrottleRef = useRef<number | null>(null);

  const images = activeTab === 'latest' ? latestImages : activeTab === 'home' ? homeImages : activeTab === 'trending' ? trendingImages : searchImages;
  const loading = activeTab === 'latest' ? latestLoading : activeTab === 'home' ? homeLoading : activeTab === 'trending' ? trendingLoading : searchLoading;
  const loadingMore = activeTab === 'latest' ? latestLoadingMore : activeTab === 'home' ? homeLoadingMore : activeTab === 'trending' ? trendingLoadingMore : searchLoadingMore;
  const error = activeTab === 'latest' ? latestError : activeTab === 'home' ? homeError : activeTab === 'trending' ? trendingError : searchError;

  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [previousTab, setPreviousTab] = useState<'latest' | 'home' | 'trending' | 'search' | 'favorites' | 'downloads' | 'settings'>("latest");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('mobiwall_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });
  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('mobiwall_columns');
      return saved ? parseInt(saved, 10) : 2;
    } catch {
      return 2;
    }
  });
  const [startTab, setStartTab] = useState(() => {
    try {
      return localStorage.getItem('mobiwall_startTab') || 'latest';
    } catch {
      return 'latest';
    }
  });
  const [doubleTapAction, setDoubleTapAction] = useState(() => {
    try {
      return localStorage.getItem('mobiwall_doubleTapAction') || 'zoom';
    } catch {
      return 'zoom';
    }
  });
  const [safeSearch, setSafeSearch] = useState(() => localStorage.getItem('mobiwall_safeSearch') !== 'false');
  const [highQuality, setHighQuality] = useState(() => localStorage.getItem('mobiwall_hq') !== 'false');
  const [favorites, setFavorites] = useState<ImageData[]>(() => {
    try {
      const saved = localStorage.getItem('mobiwall_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [downloads, setDownloads] = useState<ImageData[]>(() => {
    try {
      const saved = localStorage.getItem('mobiwall_downloads');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const recordDownload = (img: ImageData) => {
    setDownloads((prev) => {
      const next = [img, ...prev.filter(f => f.url !== img.url)];
      localStorage.setItem('mobiwall_downloads', JSON.stringify(next));
      return next;
    });
  };

  const toggleFavorite = (e: React.MouseEvent, img: ImageData) => {
    e.stopPropagation();
    setFavorites(prev => {
      const isFav = prev.some(f => f.url === img.url);
      const newFavs = isFav ? prev.filter(f => f.url !== img.url) : [img, ...prev];
      localStorage.setItem('mobiwall_favorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const fetchImages = async (
    searchQuery: string,
    targetTab: 'latest' | 'home' | 'trending' | 'search',
    append: boolean = false,
    pageOverride?: number
  ) => {
    if (targetTab === 'latest') {
      if (append) setLatestLoadingMore(true);
      else { setLatestLoading(true); setLatestImages([]); }
      setLatestError("");
    } else if (targetTab === 'home') {
      if (append) setHomeLoadingMore(true);
      else { setHomeLoading(true); setHomeImages([]); }
      setHomeError("");
    } else if (targetTab === 'trending') {
      if (append) setTrendingLoadingMore(true);
      else { setTrendingLoading(true); setTrendingImages([]); }
      setTrendingError("");
    } else {
      if (append) setSearchLoadingMore(true);
      else { setSearchLoading(true); setSearchImages([]); }
      setSearchError("");
    }

    try {
      let finalQuery = searchQuery;
      if (highQuality && !finalQuery.toLowerCase().includes("4k") && !finalQuery.toLowerCase().includes("hd") && !finalQuery.toLowerCase().includes("wallpaper")) {
        finalQuery += " wallpaper 4k";
      }
      
      const currentPage = pageOverride !== undefined ? pageOverride : (
        targetTab === 'latest' ? (append ? latestPage : 1) :
        targetTab === 'home' ? (append ? homePage : 1) :
        targetTab === 'trending' ? (append ? trendingPage : 1) :
        (append ? searchPage : 1)
      );

      const sortParam = targetTab === 'trending' ? 'trending' : 'latest';
      const apiUrl = `/api/search-images?q=${encodeURIComponent(finalQuery)}&sort=${sortParam}&safe=${safeSearch}&hq=${highQuality}&page=${currentPage}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch images");
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const results: ImageData[] = data.results || [];

      if (targetTab === 'latest') {
        if (append) {
          setLatestImages(prev => {
            const existingUrls = new Set(prev.map(p => p.url));
            const newImgs = results.filter((img: ImageData) => !existingUrls.has(img.url));
            return [...prev, ...newImgs];
          });
        } else {
          setLatestImages(results);
        }
      } else if (targetTab === 'home') {
        if (append) {
          setHomeImages(prev => {
            const existingUrls = new Set(prev.map(p => p.url));
            const newImgs = results.filter((img: ImageData) => !existingUrls.has(img.url));
            return [...prev, ...newImgs];
          });
        } else {
          setHomeImages(results);
        }
      } else if (targetTab === 'trending') {
        if (append) {
          setTrendingImages(prev => {
            const existingUrls = new Set(prev.map(p => p.url));
            const newImgs = results.filter((img: ImageData) => !existingUrls.has(img.url));
            return [...prev, ...newImgs];
          });
        } else {
          setTrendingImages(results);
        }
      } else {
        if (append) {
          setSearchImages(prev => {
            const existingUrls = new Set(prev.map(p => p.url));
            const newImgs = results.filter((img: ImageData) => !existingUrls.has(img.url));
            return [...prev, ...newImgs];
          });
        } else {
          setSearchImages(results);
        }
      }
    } catch (err: any) {
      const errMsg = err.message || "An error occurred";
      if (targetTab === 'latest') setLatestError(errMsg);
      else if (targetTab === 'home') setHomeError(errMsg);
      else if (targetTab === 'trending') setTrendingError(errMsg);
      else setSearchError(errMsg);
    } finally {
      isLoadingMoreRef.current = false;
      if (targetTab === 'latest') {
        setLatestLoading(false);
        setLatestLoadingMore(false);
      } else if (targetTab === 'home') {
        setHomeLoading(false);
        setHomeLoadingMore(false);
      } else if (targetTab === 'trending') {
        setTrendingLoading(false);
        setTrendingLoadingMore(false);
      } else {
        setSearchLoading(false);
        setSearchLoadingMore(false);
      }
    }
  };

  const refreshNewUploads = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/latest-uploads?page=1`);
      if (res.ok) {
        const data = await res.json();
        const freshList: ImageData[] = data.results || [];
        if (freshList.length > 0) {
          if (activeTab === 'latest') {
            setLatestImages(prev => {
              const existingUrls = new Set(prev.map(p => p.url));
              const newOnly = freshList.filter(f => !existingUrls.has(f.url));
              const updated = [...newOnly, ...prev];
              setFeedToast(`✨ ${newOnly.length > 0 ? newOnly.length : freshList.length} fresh uploads synchronized!`);
              setTimeout(() => setFeedToast(""), 3500);
              return updated;
            });
          } else {
            setActiveTab('latest');
            setLatestImages(freshList);
            setLatestPage(1);
            setFeedToast(`✨ ${freshList.length} fresh uploads loaded!`);
            setTimeout(() => setFeedToast(""), 3500);
          }
        }
      }
    } catch (e) {
      console.warn("Refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  // Initial load or tab switch
  useEffect(() => {
    if (activeTab === "latest" && latestImages.length === 0) {
      fetchImages("newest mobile wallpaper uploads 4k", "latest");
      setLatestPage(1);
    } else if (activeTab === "home" && homeImages.length === 0) {
      fetchImages(homeSearch, "home");
      setHomePage(1);
    } else if (activeTab === "trending" && trendingImages.length === 0) {
      fetchImages(trendingSearch, "trending");
      setTrendingPage(1);
    } else if (activeTab === "search" && searchImages.length === 0 && currentSearch) {
      fetchImages(currentSearch, "search");
      setSearchPage(1);
    }
  }, [activeTab]);

  // Settings change reload (ignored on initial render to prevent duplicate startup requests)
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    if (activeTab === "latest") {
      fetchImages("newest mobile wallpaper uploads 4k", "latest");
      setLatestPage(1);
    } else if (activeTab === "home") {
      fetchImages(homeSearch, "home");
      setHomePage(1);
    } else if (activeTab === "trending") {
      fetchImages(trendingSearch, "trending");
      setTrendingPage(1);
    } else if (activeTab === "search" && currentSearch) {
      fetchImages(currentSearch, "search");
      setSearchPage(1);
    }
  }, [safeSearch, highQuality]);

  const loadMore = useCallback(() => {
    if (isLoadingMoreRef.current) return;

    if (activeTab === "latest") {
      if (latestLoading || latestLoadingMore) return;
      isLoadingMoreRef.current = true;
      const nextPage = latestPage + 1;
      setLatestPage(nextPage);
      const catQuery = selectedCategory !== "all" ? selectedCategory : "newest mobile wallpaper uploads 4k";
      fetchImages(catQuery, "latest", true, nextPage);
    } else if (activeTab === "home") {
      if (homeLoading || homeLoadingMore) return;
      isLoadingMoreRef.current = true;
      const nextPage = homePage + 1;
      setHomePage(nextPage);
      fetchImages(homeSearch, "home", true, nextPage);
    } else if (activeTab === "trending") {
      if (trendingLoading || trendingLoadingMore) return;
      isLoadingMoreRef.current = true;
      const nextPage = trendingPage + 1;
      setTrendingPage(nextPage);
      fetchImages(trendingSearch, "trending", true, nextPage);
    } else if (activeTab === "search") {
      if (searchLoading || searchLoadingMore || !currentSearch) return;
      isLoadingMoreRef.current = true;
      const nextPage = searchPage + 1;
      setSearchPage(nextPage);
      fetchImages(currentSearch, "search", true, nextPage);
    }
  }, [activeTab, latestLoading, latestLoadingMore, latestPage, selectedCategory, homeLoading, homeLoadingMore, homePage, homeSearch, trendingLoading, trendingLoadingMore, trendingPage, trendingSearch, searchLoading, searchLoadingMore, currentSearch, searchPage]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    if (scrollThrottleRef.current !== null) return;
    const target = e.currentTarget;
    scrollThrottleRef.current = window.setTimeout(() => {
      scrollThrottleRef.current = null;
      const { scrollTop, scrollHeight, clientHeight } = target;
      if (scrollHeight - scrollTop <= clientHeight * 1.6) {
        loadMore();
      }
    }, 120);
  };

  const handleCategorySelect = (catId: string, catQuery: string) => {
    setSelectedCategory(catId);
    if (catId === "all") {
      if (activeTab === "latest") {
        setLatestPage(1);
        fetchImages("newest mobile wallpaper uploads 4k", "latest", false, 1);
      } else if (activeTab === "trending") {
        setTrendingPage(1);
        fetchImages(trendingSearch, "trending", false, 1);
      } else {
        setHomePage(1);
        fetchImages(homeSearch, "home", false, 1);
      }
    } else {
      if (activeTab === "latest") {
        setLatestPage(1);
        fetchImages(catQuery, "latest", false, 1);
      } else if (activeTab === "trending") {
        setTrendingPage(1);
        fetchImages(catQuery + " trending", "trending", false, 1);
      } else {
        setHomePage(1);
        fetchImages(catQuery, "home", false, 1);
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    addToHistory(query);
    setCurrentSearch(query);
    setSearchImages([]);
    setSearchPage(1);
    setPreviousTab(activeTab);
    setActiveTab("search");
    setIsSearching(false);
    fetchImages(query, "search", false, 1);
  };

  const handleBack = () => {
    setIsSearching(false);
    setQuery("");
    if (activeTab === "search") {
      setActiveTab(previousTab);
    }
  };

  const setTabAndLoad = (tab: 'latest' | 'home' | 'trending' | 'search' | 'favorites' | 'downloads' | 'settings', queryStr?: string) => {
    setActiveTab(tab);
    setIsSearching(false);
    setSelectedCategory("all");
    if (tab === 'latest' && latestImages.length === 0) {
      fetchImages("newest mobile wallpaper uploads 4k", "latest");
      setLatestPage(1);
    } else if (tab === 'home' && homeImages.length === 0) {
      fetchImages(homeSearch, "home");
      setHomePage(1);
    } else if (tab === 'trending' && trendingImages.length === 0) {
      fetchImages(trendingSearch, "trending");
      setTrendingPage(1);
    }
  };

  return (
    <div className={`flex flex-col h-screen w-full transition-colors duration-300 ${theme === 'dark' ? 'bg-[#121212] text-gray-100 border-gray-800' : 'bg-[#f3f3f3] text-gray-900 border-gray-300'} font-sans sm:max-w-md sm:mx-auto sm:border-x sm:shadow-2xl relative overflow-hidden`}>
      {/* Header */}
      {!isSearching ? (
        <header className={`px-4 pt-6 pb-3 ${theme === 'dark' ? 'bg-[#121212]' : 'bg-[#f3f3f3]'} flex items-center justify-between z-10 shrink-0 relative`}>
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none blur-3xl"></div>
          <div className="flex flex-col relative z-10">
            <h1 className={`text-3xl font-extrabold ${theme === 'dark' ? 'text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600'} tracking-tighter`}>Lumina</h1>
            <span className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} font-semibold tracking-[0.2em] uppercase mt-0.5`}>Premium Wallpapers</span>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <button 
              className={`p-3 rounded-full shadow-lg transition-all ${refreshing ? 'animate-spin' : 'hover:scale-105'} ${theme === 'dark' ? 'bg-[#1e1e1e] text-emerald-400 hover:bg-[#2c2c2c] shadow-black/40' : 'bg-white text-emerald-600 hover:bg-gray-50 shadow-gray-200/50'}`}
              onClick={refreshNewUploads}
              disabled={refreshing}
              title="Sync latest uploaded wallpapers"
            >
              <RefreshCw size={19} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button 
              className={`p-3 rounded-full shadow-lg transition-transform hover:scale-105 ${theme === 'dark' ? 'bg-[#1e1e1e] text-gray-300 hover:bg-[#2c2c2c] shadow-black/40' : 'bg-white text-gray-700 hover:bg-gray-50 shadow-gray-200/50'}`}
              onClick={() => setIsSearching(true)}
            >
              <Search size={20} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} />
            </button>
          </div>
        </header>
      ) : (
        <header className={`px-4 py-4 ${theme === 'dark' ? 'bg-[#121212]' : 'bg-[#f3f3f3]'} flex items-center gap-3 z-10 shrink-0`}>
          <button 
            className={`p-2 rounded-full transition-colors shrink-0 ${theme === 'dark' ? 'text-gray-300 hover:bg-[#1e1e1e]' : 'text-gray-600 hover:bg-gray-200'}`}
            onClick={handleBack}
          >
            <ChevronLeft size={24} />
          </button>
          <form onSubmit={handleSearch} className="flex-1 relative">
             <input 
                type="text"
                autoFocus
                placeholder="Search wallpapers..."
                className={`w-full rounded-full py-2.5 pl-4 pr-10 outline-none border border-transparent shadow-sm text-base transition-colors ${theme === 'dark' ? 'bg-[#1e1e1e] text-white focus:border-blue-500' : 'bg-white text-gray-700 focus:border-[#c4e0f9]'}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
             />
             {query && (
               <button
                 type="button"
                 onClick={() => setQuery("")}
                 className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
               >
                 <X size={16} />
               </button>
             )}
          </form>
        </header>
      )}

      {/* Sync Toast */}
      {feedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-emerald-400/30 animate-pulse">
          <span>{feedToast}</span>
        </div>
      )}

      {/* Autocomplete Suggestions Panel Overlay */}
      {isSearching && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`absolute top-[72px] left-0 right-0 bottom-0 z-40 flex flex-col ${theme === 'dark' ? 'bg-[#121212]' : 'bg-[#f3f3f3]'} px-4 pt-4 pb-24 overflow-y-auto no-scrollbar`}
        >
          {/* Recent Searches (History) */}
          {history.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className={`text-[11px] font-bold tracking-wider uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} flex items-center gap-1.5`}>
                  <History size={12} className="text-blue-500" /> Recent Searches
                </span>
                <button 
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem('mobiwall_search_history');
                  }} 
                  className="text-[10px] text-red-500 font-bold hover:underline"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {history.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between px-3 py-3 rounded-2xl cursor-pointer transition-all duration-200 group ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white hover:bg-[#f9f9f9] border border-gray-100 shadow-sm text-gray-700'}`}
                    onClick={() => handleSuggestionClick(item)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <History size={14} className="text-gray-400 shrink-0 group-hover:text-blue-500 transition-colors" />
                      <span className="text-sm font-medium truncate">{item}</span>
                    </div>
                    <button 
                      onClick={(e) => removeFromHistory(e, item)}
                      className={`p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested / Popular Searches */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className={`text-[11px] font-bold tracking-wider uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} flex items-center gap-1.5`}>
                <Sparkles size={11} className="text-yellow-500 fill-yellow-500 animate-pulse" />
                {query.trim() ? "Suggested Matches" : "Popular Keywords"}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {filteredSuggestions.map((item, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between px-3 py-3 rounded-2xl cursor-pointer transition-all duration-200 group ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white hover:bg-[#f9f9f9] border border-gray-100 shadow-sm text-gray-700'}`}
                  onClick={() => handleSuggestionClick(item)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Search size={14} className="text-gray-400 shrink-0 group-hover:text-blue-500 transition-colors" />
                    <span className="text-sm font-medium truncate">{item}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-lg font-bold tracking-wider uppercase ${theme === 'dark' ? 'bg-[#121212] text-emerald-400 border border-emerald-500/10' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                      4K Ultra
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Primary Feed Tabs & Category Bar */}
      {(activeTab !== "search" && activeTab !== "settings" && activeTab !== "favorites" && activeTab !== "downloads") && (
        <div className="flex flex-col gap-2 shrink-0">
          <div className="px-4 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 relative mt-0.5">
            <button 
              onClick={() => setTabAndLoad('latest')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-300 ${activeTab === 'latest' ? (theme === 'dark' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-600/30') : (theme === 'dark' ? 'bg-[#1e1e1e] text-gray-400 hover:text-white' : 'bg-white text-gray-500 hover:text-gray-900 shadow-sm border border-gray-100')}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
              <span>Fresh Uploads</span>
            </button>
            <button 
              onClick={() => setTabAndLoad('home', "latest best mobile wallpapers 4k")}
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-300 ${activeTab === 'home' ? (theme === 'dark' ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-gray-900 text-white shadow-xl shadow-gray-900/20') : (theme === 'dark' ? 'bg-[#1e1e1e] text-gray-400 hover:text-white' : 'bg-white text-gray-500 hover:text-gray-900 shadow-sm border border-gray-100')}`}
            >
              For You
            </button>
            <button 
              onClick={() => setTabAndLoad('trending', "trending popular wallpapers")}
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-300 ${activeTab === 'trending' ? (theme === 'dark' ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-gray-900 text-white shadow-xl shadow-gray-900/20') : (theme === 'dark' ? 'bg-[#1e1e1e] text-gray-400 hover:text-white' : 'bg-white text-gray-500 hover:text-gray-900 shadow-sm border border-gray-100')}`}
            >
              Trending
            </button>
          </div>

          {/* Quick Category Chips */}
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
            {CATEGORY_ITEMS.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id, cat.name)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-200 ${
                    isSelected
                      ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-blue-600 text-white shadow-md shadow-blue-500/20')
                      : (theme === 'dark' ? 'bg-[#1e1e1e] text-gray-400 hover:text-gray-200 border border-gray-800' : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200/80 shadow-sm')
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <main 
        className="flex-1 overflow-y-auto px-4 pb-28 no-scrollbar relative"
        onScroll={handleScroll}
      >
        {activeTab === 'settings' ? (
           <div className={`flex flex-col h-full mt-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
             <h2 className="text-2xl font-bold mb-6">Settings</h2>
             
             <div className="space-y-6 pb-20">
               {/* Appearance Card */}
               <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white shadow-sm'}`}>
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Moon size={18} className="text-indigo-400" /> Appearance</h3>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Dark Mode</span>
                    <button 
                      onClick={() => {
                        const next = theme === 'dark' ? 'light' : 'dark';
                        setTheme(next);
                        localStorage.setItem('mobiwall_theme', next);
                      }}
                      className={`w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
               </div>

               {/* Grid Layout Card */}
               <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white shadow-sm'}`}>
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><LayoutGrid size={18} className="text-blue-400" /> Grid Layout</h3>
                  <div className={`flex rounded-lg p-1 ${theme === 'dark' ? 'bg-[#121212]' : 'bg-gray-100'}`}>
                    <button 
                      onClick={() => {
                        setColumns(2);
                        localStorage.setItem('mobiwall_columns', '2');
                      }} 
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${columns === 2 ? (theme === 'dark' ? 'bg-gray-800 text-white shadow-md' : 'bg-white shadow text-black') : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      2 Columns
                    </button>
                    <button 
                      onClick={() => {
                        setColumns(3);
                        localStorage.setItem('mobiwall_columns', '3');
                      }} 
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${columns === 3 ? (theme === 'dark' ? 'bg-gray-800 text-white shadow-md' : 'bg-white shadow text-black') : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      3 Columns
                    </button>
                  </div>
               </div>

               {/* Startup Configuration Card */}
               <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white shadow-sm'}`}>
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Smartphone size={18} className="text-teal-400" /> App Launch</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">Startup Screen</span>
                      <span className={`text-[11px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Choose what displays when app opens</span>
                    </div>
                    <div className={`grid grid-cols-3 gap-1 rounded-lg p-1 ${theme === 'dark' ? 'bg-[#121212]' : 'bg-gray-100'}`}>
                      {[
                        { id: 'home', label: 'For You' },
                        { id: 'trending', label: 'Trending' },
                        { id: 'favorites', label: 'Favorites' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setStartTab(tab.id);
                            localStorage.setItem('mobiwall_startTab', tab.id);
                          }}
                          className={`py-1.5 text-[11px] font-bold rounded-md transition-all ${startTab === tab.id ? (theme === 'dark' ? 'bg-gray-800 text-teal-400 shadow-md' : 'bg-white shadow text-teal-600') : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
               </div>

               {/* Gestures Customization Card */}
               <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white shadow-sm'}`}>
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Heart size={18} className="text-red-400" /> Gestures</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">Double-Tap Image Shortcut</span>
                      <span className={`text-[11px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Assign quick-action in preview mode</span>
                    </div>
                    <div className={`grid grid-cols-2 gap-1 rounded-lg p-1 ${theme === 'dark' ? 'bg-[#121212]' : 'bg-gray-100'}`}>
                      <button
                        onClick={() => {
                          setDoubleTapAction('zoom');
                          localStorage.setItem('mobiwall_doubleTapAction', 'zoom');
                        }}
                        className={`py-1.5 text-xs font-bold rounded-md transition-all ${doubleTapAction === 'zoom' ? (theme === 'dark' ? 'bg-gray-800 text-blue-400 shadow-md' : 'bg-white shadow text-blue-600') : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        Scale Zoom
                      </button>
                      <button
                        onClick={() => {
                          setDoubleTapAction('favorite');
                          localStorage.setItem('mobiwall_doubleTapAction', 'favorite');
                        }}
                        className={`py-1.5 text-xs font-bold rounded-md transition-all ${doubleTapAction === 'favorite' ? (theme === 'dark' ? 'bg-gray-800 text-red-400 shadow-md' : 'bg-white shadow text-red-600') : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        Quick Favorite ❤️
                      </button>
                    </div>
                  </div>
               </div>

               {/* Search Preferences Card */}
               <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white shadow-sm'}`}>
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Sparkles size={18} className="text-yellow-400" /> Search Preferences</h3>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">Force High Quality</span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Appends HD/4K to queries</span>
                    </div>
                    <button 
                      onClick={() => {
                        const next = !highQuality;
                        setHighQuality(next);
                        localStorage.setItem('mobiwall_hq', String(next));
                      }}
                      className={`w-12 h-6 rounded-full p-1 transition-colors ${highQuality ? 'bg-blue-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${highQuality ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">Safe Search</span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Filter inappropriate content</span>
                    </div>
                    <button 
                      onClick={() => {
                        const next = !safeSearch;
                        setSafeSearch(next);
                        localStorage.setItem('mobiwall_safeSearch', String(next));
                      }}
                      className={`w-12 h-6 rounded-full p-1 transition-colors ${safeSearch ? 'bg-blue-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${safeSearch ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
               </div>

               {/* Clear Data / Storage Card */}
               <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white shadow-sm'}`}>
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-red-500"><Trash2 size={18}/> Data & Storage</h3>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => {
                        localStorage.removeItem('mobiwall_favorites');
                        localStorage.removeItem('mobiwall_downloads');
                        localStorage.removeItem('mobiwall_search_history');
                        localStorage.removeItem('mobiwall_theme');
                        localStorage.removeItem('mobiwall_columns');
                        localStorage.removeItem('mobiwall_startTab');
                        localStorage.removeItem('mobiwall_doubleTapAction');
                        setFavorites([]);
                        setDownloads([]);
                        setHistory([]);
                        setTheme('dark');
                        setColumns(2);
                        setStartTab('home');
                        setDoubleTapAction('zoom');
                        if ('caches' in window) {
                          caches.keys().then((names) => {
                            for (let name of names) {
                              caches.delete(name);
                            }
                          });
                        }
                        alert('All preferences, cache, history, and favorites have been reset successfully.');
                      }}
                      className={`w-full py-3 px-4 rounded-xl text-center text-sm font-bold transition-colors ${theme === 'dark' ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'}`}
                    >
                      Reset App Preferences & Clear Storage
                    </button>
                    <p className={`text-[11px] mt-1 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      This will reset theme settings, clear search history, downloads list, favorite cards, and delete lockscreen overlay cache.
                    </p>
                  </div>
               </div>

               {/* About Card */}
               <div className={`p-4 rounded-3xl ${theme === 'dark' ? 'bg-[#1e1e1e] border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`}>
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Info size={18} className="text-emerald-400" /> About Lumina</h3>
                  <div className="flex flex-col gap-1.5">
                     <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Lumina is an ultra-premium wallpaper search and download engine. Tailor-manufactured for mobile, featuring high-fidelity preview modes, real-time filters, and dynamic lockscreeen simulation.
                     </p>
                     <div className="h-[1px] w-full bg-gray-500/10 my-1"></div>
                     <p className={`text-[10px] uppercase tracking-wider font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        Version 3.2 • Gold Edition
                     </p>
                  </div>
               </div>
             </div>
           </div>
        ) : activeTab === 'downloads' ? (
           <div className={`flex flex-col h-full mt-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-bold">Downloads History</h2>
               {downloads.length > 0 && (
                 <button onClick={() => {
                   setDownloads([]);
                   localStorage.removeItem('mobiwall_downloads');
                 }} className="text-xs text-red-500 font-medium">Clear All</button>
               )}
             </div>
             {downloads.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-gray-400 mt-10">
                  <History size={48} className="mb-3 opacity-30" />
                  <p className="font-medium text-lg text-center">No downloads yet.</p>
                  <p className="text-sm mt-2">Saved wallpapers will appear here.</p>
                </div>
             ) : (
                <div className={`${columns === 2 ? 'columns-2' : 'columns-3'} gap-4 pb-12`}>
                  {downloads.map((img, idx) => (
                    <div key={idx} className={`relative rounded-3xl overflow-hidden cursor-pointer shadow-md inline-block w-full break-inside-avoid mb-4 transition-transform hover:scale-[1.02] ${theme === 'dark' ? 'bg-[#1e1e1e] shadow-black/20 text-gray-200' : 'bg-white shadow-gray-200/50'}`} onClick={() => setSelectedImage(img)}>
                       <img src={img.thumbnail} alt={img.title} className="w-full h-auto block" />
                       <div className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur rounded-full">
                           <Download size={14} className="text-white" />
                       </div>
                    </div>
                  ))}
                </div>
             )}
           </div>
        ) : activeTab === 'favorites' ? (
           <div className={`flex flex-col h-full mt-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
             <h2 className="text-2xl font-bold mb-6">Favorites</h2>
             {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-gray-400 mt-10">
                  <Heart size={48} className="mb-3 opacity-30" />
                  <p>No favorites yet</p>
                </div>
             ) : (
                <div className={`${columns === 2 ? 'columns-2' : 'columns-3'} gap-4 pb-12`}>
                  {favorites.map((img, idx) => (
                    <div key={idx} className={`relative rounded-3xl overflow-hidden cursor-pointer shadow-md inline-block w-full break-inside-avoid mb-4 transition-transform hover:scale-[1.02] ${theme === 'dark' ? 'bg-[#1e1e1e] shadow-black/20 text-gray-200' : 'bg-white shadow-gray-200/50'}`} onClick={() => setSelectedImage(img)}>
                       <img src={img.thumbnail} alt={img.title} className="w-full h-auto block" />
                       <div 
                           className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur rounded-full hover:bg-black/70 transition"
                           onClick={(e) => toggleFavorite(e, img)}
                       >
                          <Heart size={14} className="fill-red-500 text-red-500" />
                       </div>
                    </div>
                  ))}
                </div>
             )}
           </div>
        ) : (
          <>
            {activeTab === 'search' && !isSearching && (
              <div className="flex items-center gap-2.5 mt-2 mb-4">
                <button 
                  onClick={handleBack} 
                  className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'text-gray-300 bg-[#1e1e1e] hover:bg-[#2c2c2c]' : 'text-gray-600 bg-gray-200 hover:bg-gray-300'}`}
                >
                  <ChevronLeft size={20}/>
                </button>
                <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                  Results for "{currentSearch}"
                </h2>
              </div>
            )}
            
            {error && (
              <div className={`mt-4 p-4 rounded-2xl border text-sm text-center ${theme === 'dark' ? 'bg-red-950/20 text-red-400 border-red-900/30' : 'bg-red-50 text-red-600 border-red-100'}`}>
                {error}
              </div>
            )}
            
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center -top-20 z-0">
                <Loader2 size={32} className="animate-spin text-gray-400 mb-2" />
                <p className="text-gray-400 text-sm font-medium">{activeTab === 'search' ? "Searching internet..." : activeTab === 'latest' ? "Syncing fresh uploads..." : "Curating wallpapers..."}</p>
              </div>
            ) : (
              <div className={`grid ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-3 mt-2`}>
                {images.map((img, idx) => (
                  <WallpaperCard
                    key={`${img.url}-${idx}`}
                    img={img}
                    idx={idx}
                    theme={theme}
                    isFavorite={favorites.some(f => f.url === img.url)}
                    onToggleFavorite={(e) => toggleFavorite(e, img)}
                    onClick={() => setSelectedImage(img)}
                  />
                ))}
              </div>
            )}
            
            {!loading && images.length === 0 && (
               <div className="text-center mt-20 text-gray-400">
                  <ImageIcon size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-semibold text-base">No wallpapers found</p>
                  <p className="text-xs mt-1 text-gray-500">Tap the refresh icon above or try another category</p>
               </div>
            )}

            {loadingMore && (
              <div className="flex justify-center items-center py-6">
                 <Loader2 size={24} className="animate-spin text-emerald-400" />
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className={`absolute bottom-4 left-4 right-4 h-16 ${theme === 'dark' ? 'bg-[#1e1e1e]/85 border-gray-800 text-white shadow-black/60' : 'bg-white/90 border-gray-100 text-black shadow-gray-200/60'} backdrop-blur-2xl border flex items-center justify-around px-2 z-20 rounded-full shadow-2xl`}>
         <button 
           onClick={() => setTabAndLoad('latest')}
           className={`flex flex-col items-center gap-1 w-12 transition-colors ${activeTab === 'latest' ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600 font-bold') : 'text-gray-400 hover:text-gray-500'}`}
         >
            <Sparkles size={21} className={activeTab === 'latest' ? (theme === 'dark' ? 'text-emerald-400 fill-emerald-400' : 'text-emerald-600 fill-emerald-600') : ''} />
            <span className="text-[10px] font-semibold">Fresh</span>
         </button>
         <button 
           onClick={() => setTabAndLoad('home', "latest best mobile wallpapers 4k")}
           className={`flex flex-col items-center gap-1 w-12 transition-colors ${activeTab === 'home' ? (theme === 'dark' ? 'text-white' : 'text-black') : 'text-gray-400 hover:text-gray-500'}`}
         >
            <Home size={21} className={activeTab === 'home' ? (theme === 'dark' ? "fill-white" : "fill-black") : ""} />
            <span className="text-[10px] font-semibold">For You</span>
         </button>
         <button 
           onClick={() => setTabAndLoad('trending', "trending popular wallpapers")}
           className={`flex flex-col items-center gap-1 w-12 transition-colors ${activeTab === 'trending' ? (theme === 'dark' ? 'text-white' : 'text-black') : 'text-gray-400 hover:text-gray-500'}`}
         >
            <CompassIcon size={21} className={activeTab === 'trending' ? (theme === 'dark' ? "fill-white" : "fill-black") : ""} />
            <span className="text-[10px] font-semibold">Discover</span>
         </button>
         <button 
           onClick={() => setTabAndLoad('favorites', "")}
           className={`flex flex-col items-center gap-1 w-12 transition-colors ${activeTab === 'favorites' ? (theme === 'dark' ? 'text-white' : 'text-black') : 'text-gray-400 hover:text-gray-500'}`}
         >
            <Heart size={21} className={activeTab === 'favorites' ? "fill-red-500 text-red-500" : ""} />
            <span className="text-[10px] font-semibold">Favorites</span>
         </button>
         <button 
           onClick={() => setTabAndLoad('settings', "")}
           className={`flex flex-col items-center gap-1 w-12 transition-colors ${activeTab === 'settings' ? (theme === 'dark' ? 'text-white' : 'text-black') : 'text-gray-400 hover:text-gray-500'}`}
         >
            <Settings size={21} className={activeTab === 'settings' ? (theme === 'dark' ? "fill-white" : "fill-black") : ""} />
            <span className="text-[10px] font-semibold">Settings</span>
         </button>
      </nav>

      <AnimatePresence>
        {selectedImage && (
          <ImageModal 
            img={selectedImage} 
            onClose={() => setSelectedImage(null)} 
            theme={theme}
            isFavorite={favorites.some(f => f.url === selectedImage.url)}
            onToggleFavorite={(e) => toggleFavorite(e, selectedImage)}
            onDownloadComplete={(img) => recordDownload(img)}
            doubleTapAction={doubleTapAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const WallpaperCard = memo(function WallpaperCard({
  img,
  idx,
  theme,
  isFavorite,
  onToggleFavorite,
  onClick
}: {
  key?: string | number;
  img: ImageData;
  idx: number;
  theme: string;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const [stage, setStage] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const hashVal = (() => {
    const s = img.url || img.title || "wallpaper";
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  })();

  const currentSrc = (() => {
    if (stage === 0) return img.thumbnail || img.url;
    if (stage === 1) return `/api/image-proxy?url=${encodeURIComponent(img.thumbnail || img.url)}`;
    if (stage === 2 && img.url && img.url !== img.thumbnail) return `/api/image-proxy?url=${encodeURIComponent(img.url)}`;
    return FALLBACK_WALLPAPERS[hashVal % FALLBACK_WALLPAPERS.length];
  })();

  const handleError = () => {
    if (stage < 3) {
      setStage(prev => prev + 1);
    }
  };

  const isLiveItem = img.isLive || img.isVideo || (img.badge && img.badge.includes('LIVE'));
  const isNewItem = img.isNew || img.badge === 'NEW';
  const is4K = (img.width && img.width >= 3840) || isLiveItem;
  const isUHD = img.width && img.width >= 1920;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden cursor-pointer shadow-sm aspect-[9/16] w-full group select-none transition-transform active:scale-[0.98] ${
        theme === 'dark' ? 'bg-[#1a1a1a] text-gray-200' : 'bg-gray-200 text-gray-800'
      }`}
      onClick={onClick}
    >
      {/* Background Skeleton Placeholder until loaded */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-neutral-800/40 animate-pulse flex items-center justify-center">
          <ImageIcon size={20} className="text-gray-500 opacity-40" />
        </div>
      )}

      {img.isVideo ? (
        <video
          src={img.videoUrl || img.url}
          poster={img.thumbnail}
          autoPlay
          loop
          muted
          playsInline
          className={`w-full h-full object-cover block will-change-transform group-hover:scale-105 transition-all duration-300 pointer-events-none ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoadedData={() => setIsLoaded(true)}
        />
      ) : (
        <img
          src={currentSrc}
          alt={img.title || "Wallpaper"}
          className={`w-full h-full object-cover block will-change-transform group-hover:scale-105 transition-all duration-300 pointer-events-none ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onError={handleError}
          onLoad={() => setIsLoaded(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
        />
      )}

      {/* Live Badge or Quality Badge */}
      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase bg-black/75 text-white flex items-center gap-1 shadow-sm select-none pointer-events-none">
        {isLiveItem ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-red-400 font-extrabold">LIVE</span>
          </>
        ) : (
          <>
            <Sparkles size={9} className="text-yellow-400 fill-yellow-400" />
            <span>{is4K ? "4K" : isUHD ? "UHD" : "HQ"}</span>
          </>
        )}
      </div>

      {/* Fresh/New Badge */}
      {isNewItem && !isLiveItem && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase bg-emerald-600 text-white flex items-center gap-1 shadow-sm select-none z-10 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
          <span>NEW</span>
        </div>
      )}

      {/* Hover & Favorite overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
        <div className="flex justify-end">
          <button
            type="button"
            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition text-white"
            onClick={onToggleFavorite}
          >
            <Heart size={15} className={isFavorite ? 'fill-red-500 text-red-500' : 'text-white'} />
          </button>
        </div>
        {img.title && (
          <p className="text-[11px] text-white line-clamp-1 font-medium px-0.5">
            {img.title}
          </p>
        )}
      </div>
    </div>
  );
});

function ImageModal({ img, onClose, theme, isFavorite, onToggleFavorite, onDownloadComplete, doubleTapAction }: { img: ImageData, onClose: () => void, theme: string, isFavorite: boolean, onToggleFavorite: (e: React.MouseEvent) => void, onDownloadComplete: (img: ImageData) => void, doubleTapAction: string }) {
  const [downloading, setDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [scale, setScale] = useState(1);
  const [lastTap, setLastTap] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewTime, setPreviewTime] = useState(new Date());
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'none' | 'grayscale' | 'sepia' | 'vintage' | 'contrast' | 'warm'>('none');
  const [modalStage, setModalStage] = useState(0);
  const [torchActive, setTorchActive] = useState(false);

  const hashVal = (() => {
    const s = img.url || img.title || "wallpaper";
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  })();

  const modalSrc = (() => {
    if (modalStage === 0) return img.url;
    if (modalStage === 1 && img.thumbnail && img.thumbnail !== img.url) return img.thumbnail;
    if (modalStage === 2) return `/api/image-proxy?url=${encodeURIComponent(img.url)}`;
    return FALLBACK_WALLPAPERS[hashVal % FALLBACK_WALLPAPERS.length];
  })();

  const handleModalImgError = () => {
    if (modalStage < 3) {
      setModalStage(prev => prev + 1);
    }
  };

  const filterStyles: Record<string, string> = {
    none: 'none',
    grayscale: 'grayscale(100%)',
    sepia: 'sepia(100%)',
    vintage: 'sepia(45%) saturate(125%) contrast(90%) brightness(105%)',
    contrast: 'contrast(135%)',
    warm: 'sepia(20%) saturate(130%) hue-rotate(-10deg)'
  };

  useEffect(() => {
    if (previewMode) {
      const interval = setInterval(() => setPreviewTime(new Date()), 1000);
      return () => clearInterval(interval);
    }
  }, [previewMode]);

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTap < 300) {
      if (doubleTapAction === 'favorite') {
        onToggleFavorite(e as any);
        setShowHeartPop(true);
        setTimeout(() => setShowHeartPop(false), 800);
      } else {
        setScale(prev => prev === 1 ? 2 : 1);
      }
    }
    setLastTap(now);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/download?url=${encodeURIComponent(img.url)}`);
      if (!response.ok) {
          window.open(img.url, '_blank');
      } else {
          const blob = await response.blob();
          let ext = 'jpg';
          if (blob.type && blob.type.startsWith('image/')) {
             ext = blob.type.split('/')[1].replace('jpeg', 'jpg');
          } else {
             const extMatch = img.url.match(/\.(jpeg|jpg|png|webp)(\?|$)/i);
             if (extMatch) ext = extMatch[1].toLowerCase().replace('jpeg', 'jpg');
          }
          
          let cleanTitle = img.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          if (!cleanTitle) cleanTitle = 'lumina_wallpaper';
          const filename = `${cleanTitle}_${Date.now()}.${ext}`;
          
          let downloadBlob = blob;
          if (activeFilter !== 'none') {
             try {
                const filtered = await new Promise<Blob>((resolve) => {
                  const imgObj = new Image();
                  const localUrl = URL.createObjectURL(blob);
                  imgObj.src = localUrl;
                  imgObj.onload = () => {
                    try {
                      const canvas = document.createElement('canvas');
                      canvas.width = imgObj.naturalWidth || imgObj.width;
                      canvas.height = imgObj.naturalHeight || imgObj.height;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) {
                        URL.revokeObjectURL(localUrl);
                        resolve(blob);
                        return;
                      }
                      if (filterStyles[activeFilter] && activeFilter !== 'none') {
                        ctx.filter = filterStyles[activeFilter];
                      }
                      ctx.drawImage(imgObj, 0, 0);
                      canvas.toBlob((resBlob) => {
                        URL.revokeObjectURL(localUrl);
                        resolve(resBlob || blob);
                      }, blob.type || 'image/jpeg', 1.0);
                    } catch (err) {
                      console.error("Canvas filtering exception:", err);
                      URL.revokeObjectURL(localUrl);
                      resolve(blob);
                    }
                  };
                  imgObj.onerror = () => {
                    URL.revokeObjectURL(localUrl);
                    resolve(blob);
                  };
                });
                downloadBlob = filtered;
             } catch (filterErr) {
                console.error("Filter process failed, using original:", filterErr);
             }
          }

          const blobUrl = window.URL.createObjectURL(downloadBlob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
      }
      setToastMessage("Saved to Downloads folder");
      setTimeout(() => setToastMessage(""), 4000);
      onDownloadComplete(img);
    } catch (e) {
      console.error(e);
      window.open(img.url, '_blank');
      setToastMessage("Opened in new tab");
      setTimeout(() => setToastMessage(""), 3000);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: img.title || "Check out this wallpaper!",
          url: img.source || img.url
        });
      } else {
        throw new Error("Share not supported");
      }
    } catch (err: any) {
      if (err && (err.name === 'AbortError' || 
                 (err.message && err.message.toLowerCase().includes('cancel')) || 
                 (err.message && err.message.toLowerCase().includes('abort')))) {
        console.log("Sharing flow cancelled by user");
        return;
      }
      try {
        await navigator.clipboard.writeText(img.source || img.url);
        setToastMessage("Link copied to clipboard!");
        setTimeout(() => setToastMessage(""), 3000);
      } catch (clipErr) {
        console.error("Clipboard copy fallback failed:", clipErr);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-md sm:max-w-md sm:mx-auto sm:border-x ${theme === 'dark' ? 'sm:border-gray-800' : 'sm:border-gray-400'}`}
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 left-6 p-2 bg-black/40 text-white rounded-full backdrop-blur-md"
      >
        <X size={24} />
      </button>

      <motion.div 
         initial={{ y: 50, opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         exit={{ y: 50, opacity: 0 }}
         transition={{ type: "spring", damping: 25, stiffness: 200 }}
         className="flex-1 flex items-center justify-center p-4 pointer-events-none relative"
      >
        {img.isVideo ? (
          <video
            src={img.videoUrl || img.url}
            poster={img.thumbnail}
            autoPlay
            loop
            muted
            playsInline
            className={`w-full max-h-[70vh] rounded-[36px] object-cover shadow-2xl pointer-events-auto transition-all duration-300 ${scale > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            style={{ filter: filterStyles[activeFilter] }}
            onPointerDown={handleTap}
          />
        ) : (
          <motion.img 
            src={modalSrc} 
            alt={img.title}
            className={`w-full max-h-[70vh] rounded-[36px] object-cover shadow-2xl pointer-events-auto transition-all duration-300 ${scale > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            style={{ filter: filterStyles[activeFilter] }}
            drag={scale > 1}
            dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
            animate={{ scale }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onPointerDown={handleTap}
            onError={handleModalImgError}
            referrerPolicy="no-referrer"
          />
        )}
        
        {/* Double Tap Heart Pop Overlay */}
        <AnimatePresence>
          {showHeartPop && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.2, 1], opacity: [0, 1, 1] }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute z-30 flex items-center justify-center pointer-events-none"
            >
              <Heart size={80} className="fill-red-500 text-red-500 drop-shadow-[0_4px_12px_rgba(239,68,68,0.5)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Torch Screen Glow Simulation */}
        {torchActive && (
          <div className="absolute inset-4 rounded-[36px] bg-amber-100/35 pointer-events-none z-20 shadow-[inset_0_0_100px_rgba(251,191,36,0.8)] backdrop-brightness-125" />
        )}
        
        {/* Lock Screen Preview Overlay */}
        <AnimatePresence>
           {previewMode && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-4 top-8 pointer-events-none z-10 flex flex-col justify-between py-6 px-4"
             >
               {/* Status Bar */}
               <div className="flex justify-between items-center text-white/90 text-xs px-2 font-medium">
                 <span>5G</span>
                 <div className="flex items-center gap-1.5">
                   <span>98%</span>
                   <div className="w-5 h-2.5 rounded-[3px] border border-white/80 p-0.5 flex items-center">
                     <div className="h-full w-full bg-white rounded-[1px]"></div>
                   </div>
                 </div>
               </div>

               {/* Live Lock Screen Clock & Date */}
               <div className="flex flex-col items-center mt-3 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                 <span className="text-sm font-semibold tracking-wide uppercase opacity-90">{previewTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric'})}</span>
                 <span className="text-7xl font-bold tracking-tighter mt-[-2px]">{previewTime.toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit', hour12: false })}</span>
               </div>
               
               {/* Bottom Lock Screen Actions: Interactive Torch & Camera */}
               <div className="flex justify-between items-end px-3 mb-6 opacity-95 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                 <button
                   type="button"
                   onClick={(e) => {
                     e.stopPropagation();
                     setTorchActive(prev => !prev);
                   }}
                   className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center border pointer-events-auto transition active:scale-90 ${
                     torchActive ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.9)]' : 'bg-black/40 text-white border-white/20'
                   }`}
                   title="Toggle Flashlight"
                 >
                   <Flashlight size={22} className={torchActive ? "fill-black text-black" : "text-white"} />
                 </button>

                 <button
                   type="button"
                   onClick={(e) => {
                     e.stopPropagation();
                     setToastMessage("📸 Camera Activated");
                     setTimeout(() => setToastMessage(""), 2000);
                   }}
                   className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 text-white pointer-events-auto transition active:scale-90"
                   title="Open Camera"
                 >
                   <Camera size={22} />
                 </button>
               </div>
             </motion.div>
           )}
        </AnimatePresence>
      </motion.div>

      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white'} rounded-t-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.4)] pb-8 pointer-events-auto relative z-20`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-12 h-1.5 rounded-full mx-auto mb-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
        <div className="flex items-center justify-between gap-4 mb-2">
          <h3 className={`font-bold text-xl line-clamp-2 leading-tight ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{img.title}</h3>
          <div className="flex gap-2">
            <button 
               className={`p-3 rounded-full transition shrink-0 ${previewMode ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : (theme === 'dark' ? 'bg-[#2c2c2c] text-white' : 'bg-gray-100 text-gray-600')}`}
               onClick={() => setPreviewMode(!previewMode)}
               title="Toggle Lock Screen Preview"
            >
               <Smartphone size={22} />
            </button>
            <button 
               className={`p-3 rounded-full transition shrink-0 ${theme === 'dark' ? 'bg-[#2c2c2c]' : 'bg-gray-100'}`}
               onClick={handleShare}
            >
               <Share2 size={22} className={theme === 'dark' ? 'text-white' : 'text-gray-600'} />
            </button>
            <button 
               className={`p-3 rounded-full transition shrink-0 ${isFavorite ? 'bg-red-500/10' : (theme === 'dark' ? 'bg-[#2c2c2c]' : 'bg-gray-100')}`}
               onClick={onToggleFavorite}
            >
               <Heart size={22} className={isFavorite ? 'fill-red-500 text-red-500' : (theme === 'dark' ? 'text-white' : 'text-gray-600')} />
            </button>
          </div>
        </div>

        {/* Quality/Resolution Premium Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 ${
            img.width && img.width >= 3840 
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse' 
              : img.width && img.width >= 1920 
                ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse' 
                : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
          }`}>
            <Sparkles size={10} className="text-yellow-400 fill-yellow-400 animate-pulse" />
            {img.width && img.width >= 3840 ? '4K Ultra HD' : img.width && img.width >= 1920 ? 'Full HD' : 'High Resolution'}
          </span>
          <span className={`text-[11px] font-semibold font-mono tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {img.width && img.height ? `${img.width} × ${img.height} PX` : 'Original high-fidelity wallpaper'}
          </span>
        </div>

        {/* CSS Image Filters Selector Preview */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles size={14} className={theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} />
            <span className={`text-[10px] font-bold tracking-wider uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Visual filters preview
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
            {[
              { id: 'none', label: 'Original' },
              { id: 'grayscale', label: 'Mono' },
              { id: 'sepia', label: 'Sepia' },
              { id: 'vintage', label: 'Vintage' },
              { id: 'contrast', label: 'Contrast' },
              { id: 'warm', label: 'Warm' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as any)}
                className={`py-1.5 px-0.5 rounded-xl text-[9px] sm:text-[10px] font-bold transition-all border outline-none flex flex-col items-center justify-center gap-1 ${
                  activeFilter === filter.id 
                    ? (theme === 'dark' ? 'bg-white text-black border-white shadow-md shadow-white/5' : 'bg-black text-white border-black shadow-md shadow-black/5')
                    : (theme === 'dark' ? 'bg-[#2c2c2c]/40 text-gray-400 border-transparent hover:text-white' : 'bg-gray-100 text-gray-500 border-transparent hover:text-gray-900')
                }`}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden relative shadow-inner">
                  <img 
                    src={img.thumbnail || modalSrc} 
                    alt={filter.label} 
                    className="w-full h-full object-cover select-none transition-all duration-300"
                    style={{ filter: filterStyles[filter.id] }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_WALLPAPERS[0];
                    }}
                  />
                  {activeFilter === filter.id && (
                    <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center border border-white/20 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    </div>
                  )}
                </div>
                <span className="truncate max-w-full text-center leading-tight">{filter.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6"></div>
        
        <button 
          onClick={handleDownload}
          disabled={downloading}
          className={`w-full py-4 rounded-full font-bold transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-xl ${theme === 'dark' ? 'bg-white text-black shadow-white/10' : 'bg-black text-white shadow-black/20'}`}
        >
          {downloading ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span>Preparing image...</span>
            </>
          ) : (
            <>
              <Download size={22} />
              <span>Download High Quality</span>
               <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-black/10' : 'bg-white/20 text-white/90'}`}>HD</span>
            </>
          )}
        </button>
      </motion.div>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
             initial={{ opacity: 0, y: 50 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 50 }}
             className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#333]/90 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 text-sm font-medium whitespace-nowrap"
          >
            <CheckCircle size={18} className="text-green-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

