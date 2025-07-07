"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { MediaCard } from "./MediaCard";
import { Token } from "@/utils/coins";
import {
  useCoinsStore,
  useNewCoinsStore,
  useTopVolumeCoinsStore,
  useTopGainersCoinsStore,
} from "@/store/useCoin";
import LoadingCard from "./LoadingCard";

type MediaFeedProps = {
  tokens: Token[];
  pagination: string;
  coinType?: "new" | "top-volume" | "top-gainers";
};

export const MediaFeed: React.FC<MediaFeedProps> = ({
  tokens: initialTokens,
  pagination,
  coinType = "top-volume",
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef(0);
  const scrollCooldown = 800; // Longer cooldown to prevent multiple scrolls

  // console.log(initialTokens, "initialTokens");

  // Select appropriate store based on coin type
  const getStore = () => {
    switch (coinType) {
      case "top-volume":
        return useTopVolumeCoinsStore();
      case "top-gainers":
        return useTopGainersCoinsStore();
      case "new":
      default:
        return useNewCoinsStore();
    }
  };

  const {
    setCoins,
    setPagination,
    isLoading,
    updateCurrentCoinIndex,
    currentCoinIndex,
    coins,
  } = getStore();

  // Initialize store only once
  useEffect(() => {
    if (coins.length === 0 && initialTokens.length > 0) {
      console.log("Initializing coins store for type:", coinType);
      setCoins(initialTokens);
      setPagination(pagination);
    }
  }, [
    initialTokens,
    pagination,
    setCoins,
    setPagination,
    coinType,
    coins.length,
  ]);

  const handleNavigation = useCallback(
    async (direction: "up" | "down") => {
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
        await updateCurrentCoinIndex(direction);
      } catch (error) {
        console.error("Navigation error:", error);
      } finally {
        setTimeout(() => setIsTransitioning(false), 300);
      }
    },
    [isTransitioning, isLoading, updateCurrentCoinIndex]
  );

  // Optimized scroll handling with debouncing
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !container.tagName) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const { deltaY } = e;
      if (Math.abs(deltaY) < 100) return; // Much higher threshold to prevent multiple scrolls

      const direction = deltaY > 0 ? "up" : "down";
      handleNavigation(direction);
    };

    // Touch handling for mobile
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

      // Only trigger if swipe is fast enough and long enough
      if (Math.abs(deltaY) > 120 && deltaTime < 400) {
        const direction = deltaY > 0 ? "up" : "down";
        handleNavigation(direction);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleNavigation]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        handleNavigation("up");
      } else if (e.key === "ArrowDown") {
        handleNavigation("down");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNavigation]);

  if (!coins.length && !initialTokens.length) {
    return (
      <div className="flex items-center justify-center h-full">
        No tokens found
      </div>
    );
  }

  // Calculate the total number of slides including the loading placeholder
  // const totalSlides = coins.length + (isLoading ? 1 : 0);

  return (
    <div
      ref={containerRef}
      className="h-full w-full relative overflow-hidden bg-black cursor-pointer"
      style={{ touchAction: "none" }}
    >
      <div
        className="relative h-full w-full"
        style={{
          transition: isTransitioning
            ? "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            : "none",
          transform: `translateY(-${currentCoinIndex * 100}%)`,
        }}
      >
        {coins.map((token, idx) => (
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
                idx === currentCoinIndex && !isLoading && !isTransitioning
              }
              marketCap={String(token.marketCap || "0")}
              marketCapDelta24h={String(token.marketCapDelta24h || "0")}
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

        {/* Loading placeholder */}
        {isLoading && (
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              transform: `translateY(${coins.length * 100}%)`,
            }}
          >
            <LoadingCard />
          </div>
        )}
      </div>

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded text-xs">
          <div>Current: {currentCoinIndex}</div>
          <div>Total: {coins.length}</div>
          <div>Loading: {isLoading ? "Yes" : "No"}</div>
        </div>
      )}
    </div>
  );
};
