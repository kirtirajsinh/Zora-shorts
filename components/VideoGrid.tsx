"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Token } from "@/utils/coins";
import { MediaCard } from "./MediaCard";
import {
  useTopGainersCoinsStore,
  useTopVolumeCoinsStore,
} from "@/store/useCoin";
import LoadingCard from "./LoadingCard";
import Image from "next/image";

export const VideoGrid: React.FC = () => {
  // Use existing stores for data
  const gainersStore = useTopGainersCoinsStore();
  const volumeStore = useTopVolumeCoinsStore();

  // Combine and shuffle tokens from both stores
  const getCombinedTokens = useCallback(() => {
    const gainersWithMedia = gainersStore.coins.filter(
      (t) => t.mediaContent?.originalUri
    );
    const volumeWithMedia = volumeStore.coins.filter(
      (t) => t.mediaContent?.originalUri
    );
    const allTokens = [...gainersWithMedia, ...volumeWithMedia];
    return allTokens.sort(() => Math.random() - 0.5);
  }, [gainersStore.coins, volumeStore.coins]);

  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(
    null
  );
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef(0);
  const scrollCooldown = 800; // Same as MediaFeed

  // Initialize tokens when stores have data
  useEffect(() => {
    const combinedTokens = getCombinedTokens();
    if (combinedTokens.length > 0) {
      setTokens(combinedTokens);
    }
  }, [getCombinedTokens]);

  // Load more videos from both sources using existing stores
  const loadMoreVideos = useCallback(async () => {
    if (isLoading || (!gainersStore.pagination && !volumeStore.pagination))
      return;

    setIsLoading(true);
    try {
      const promises = [];

      if (gainersStore.pagination) {
        promises.push(gainersStore.loadMoreCoins("top-gainers"));
      }

      if (volumeStore.pagination) {
        promises.push(volumeStore.loadMoreCoins("top-volume"));
      }

      await Promise.all(promises);

      // Update tokens with new data from stores
      const combinedTokens = getCombinedTokens();
      setTokens(combinedTokens);
    } catch (error) {
      console.error("Error loading more videos:", error);
      // Go back to last valid video if loading fails
      setCurrentVideoIndex(Math.max(0, tokens.length - 1));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, gainersStore, volumeStore, getCombinedTokens, tokens.length]);

  // Handle scroll in video player mode with same logic as MediaFeed
  const handleVideoScroll = useCallback(
    async (direction: "up" | "down") => {
      if (selectedVideoIndex === null) return;

      const now = Date.now();
      if (
        isTransitioning ||
        isLoading ||
        now - lastScrollTime.current < scrollCooldown
      ) {
        return;
      }

      lastScrollTime.current = now;
      setIsTransitioning(true);

      try {
        const newIndex =
          direction === "up"
            ? Math.min(currentVideoIndex + 1, tokens.length - 1)
            : Math.max(currentVideoIndex - 1, 0);

        setCurrentVideoIndex(newIndex);

        // Load more videos when near the end (similar to MediaFeed logic)
        if (newIndex === tokens.length - 1) {
          // If we're at the last video and have more to load
          if (gainersStore.hasMore || volumeStore.hasMore) {
            console.log("At last video, loading more...");
            // Move to loading slot immediately (like MediaFeed)
            setCurrentVideoIndex(tokens.length);
            await loadMoreVideos();
          } else {
            console.log("No more videos to load");
          }
        } else if (newIndex >= tokens.length - 3) {
          // Preload when close to the end
          await loadMoreVideos();
        }
      } catch (error) {
        console.error("Navigation error:", error);
      } finally {
        setTimeout(() => setIsTransitioning(false), 300);
      }
    },
    [
      selectedVideoIndex,
      currentVideoIndex,
      tokens.length,
      loadMoreVideos,
      isTransitioning,
      isLoading,
    ]
  );

  // Handle wheel scroll in video player with same logic as MediaFeed
  useEffect(() => {
    if (selectedVideoIndex === null) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const { deltaY } = e;
      if (Math.abs(deltaY) < 100) return; // Same threshold as MediaFeed

      const direction = deltaY > 0 ? "up" : "down";
      handleVideoScroll(direction);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [selectedVideoIndex, handleVideoScroll]);

  // Handle keyboard navigation in video player
  useEffect(() => {
    if (selectedVideoIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        handleVideoScroll("down");
      } else if (e.key === "ArrowDown") {
        handleVideoScroll("up");
      } else if (e.key === "Escape") {
        setSelectedVideoIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedVideoIndex, handleVideoScroll]);

  // Handle touch gestures in video player with same logic as MediaFeed
  useEffect(() => {
    if (selectedVideoIndex === null) return;

    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();
      const deltaY = touchStartY - touchEndY;
      const deltaTime = touchEndTime - touchStartTime;

      // Same logic as MediaFeed
      if (Math.abs(deltaY) > 120 && deltaTime < 400) {
        const direction = deltaY > 0 ? "up" : "down";
        handleVideoScroll(direction);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [selectedVideoIndex, handleVideoScroll]);

  // Infinite scroll for grid
  useEffect(() => {
    if (selectedVideoIndex !== null) return;

    const handleScroll = () => {
      if (!gridRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = gridRef.current;
      // Load more when user is within 2 screens of the bottom
      if (scrollTop + clientHeight >= scrollHeight - (clientHeight * 2)) {
        loadMoreVideos();
      }
    };

    const gridElement = gridRef.current;
    if (gridElement) {
      gridElement.addEventListener("scroll", handleScroll);
      return () => gridElement.removeEventListener("scroll", handleScroll);
    }
  }, [selectedVideoIndex, loadMoreVideos]);

  // Preload more content when tokens are low
  useEffect(() => {
    if (selectedVideoIndex !== null) return;
    
    // Auto-load more when we have less than 20 items and more are available
    if (tokens.length < 20 && (gainersStore.hasMore || volumeStore.hasMore) && !isLoading) {
      loadMoreVideos();
    }
  }, [tokens.length, gainersStore.hasMore, volumeStore.hasMore, isLoading, selectedVideoIndex, loadMoreVideos]);

  const handleVideoClick = (index: number) => {
    setSelectedVideoIndex(index);
    setCurrentVideoIndex(index);
  };

  const handleBackToGrid = () => {
    setSelectedVideoIndex(null);
  };

  if (selectedVideoIndex !== null) {
    // Video player mode
    return (
      <div className="h-full w-full relative overflow-hidden bg-black">
        <button
          onClick={handleBackToGrid}
          className="absolute top-4 left-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
        >
          ← Back
        </button>

        <div
          className="relative h-full w-full"
          style={{
            transition: isTransitioning
              ? "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
              : "none",
            transform: `translateY(-${currentVideoIndex * 100}%)`,
          }}
        >
          {tokens.map((token, idx) => (
            <div
              key={`${token.id}-${idx}`}
              className="absolute top-0 left-0 w-full h-full"
              style={{
                transform: `translateY(${idx * 100}%)`,
              }}
            >
              <MediaCard
                id={token.id || idx}
                media={token.mediaContent}
                name={token.name}
                isActive={
                  idx === currentVideoIndex && !isLoading && !isTransitioning
                }
                marketCapDelta24h={String(token.marketCapDelta24h || "0")}
                marketCap={String(token.marketCap || "0")}
                uniqueHolders={token.uniqueHolders || 0}
                creator={token.creator}
                description={token.description}
                symbol={token.symbol}
                volume={String(token.totalVolume || "0")}
                isLoading={false}
                tokenAddress={token.address}
              />
            </div>
          ))}

          {/* Loading placeholder - same as MediaFeed */}
          {isLoading && (
            <div
              className="absolute top-0 left-0 w-full h-full"
              style={{
                transform: `translateY(${tokens.length * 100}%)`,
              }}
            >
              <LoadingCard />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid mode
  return (
    <div ref={gridRef} className="h-full w-full bg-black overflow-y-auto">
      <div className="grid grid-cols-3 gap-1 p-1">
        {tokens.map((token, index) => (
          <div
            key={token.id}
            className="relative aspect-[3/4] cursor-pointer group"
            onClick={() => handleVideoClick(index)}
          >
            <Image
              src={
                token.mediaContent?.previewImage?.medium || "/placeholder.png"
              }
              alt={token.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 20vw"
            />
            {/* Overlay for hover effect */}
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Market data display */}
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1.5 text-white font-bold text-sm flex flex-col gap-1 pointer-events-none transition-all duration-300 opacity-90 group-hover:opacity-100 group-hover:bg-black/80">
              <div className="flex items-center gap-1">
                <span className="text-white text-base">$</span>
                <span
                  className={`text-base font-extrabold ${
                    parseFloat(token.marketCapDelta24h || "0") >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {parseFloat(token.marketCapDelta24h || "0") >= 0 ? "+" : ""}
                  {parseFloat(token.marketCapDelta24h || "0").toFixed(2)}%
                </span>
              </div>
              <div className="text-gray-200 text-sm font-medium">
                MC: ${parseFloat(token.marketCap || "0").toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="col-span-3 flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-white"></div>
          </div>
        )}
        
        {/* Load more trigger - invisible element that triggers loading when scrolled into view */}
        {(gainersStore.hasMore || volumeStore.hasMore) && !isLoading && (
          <div className="col-span-3 h-20 flex items-center justify-center">
            <div className="text-white/60 text-sm">Loading more videos...</div>
          </div>
        )}
      </div>
    </div>
  );
};
