"use client";
import Image from "next/image";
import React, { useEffect, useRef, useCallback, useState } from "react";
import { BuyDrawer } from "./BuyDrawer";

type MediaContent = {
  mimeType: string;
  originalUri: string;
  previewImage?: {
    small?: string;
    medium?: string;
    blurhash?: string;
  };
};

type MediaCardProps = {
  id: string | number;
  media: MediaContent;
  name: string;
  isActive: boolean;
  volume24h: string;
  marketCapDelta24h: string;
  uniqueHolders: number;
  transfers: number;
  creator?: {
    handle: string;
    avatar?: {
      previewImage?: {
        small?: string;
        medium?: string;
        blurhash?: string;
      };
    };
  };
  description: string;
  symbol: string;
  volume: string;
  isLoading?: boolean;
  tokenAddress: string;
};

const getMediaUrl = (uri: string) => {
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`;
  }
  return uri;
};

// Helper function to check if video format is supported
const isVideoFormatSupported = (mimeType: string): boolean => {
  const video = document.createElement("video");
  const canPlay = video.canPlayType(mimeType);
  return canPlay === "probably" || canPlay === "maybe";
};

// List of formats that need special handling
const PROBLEMATIC_FORMATS = new Map([
  [
    "video/quicktime",
    {
      fallbackType: "video/mp4",
      message: "QuickTime format detected, trying MP4 fallback",
    },
  ],
  [
    "video/x-msvideo",
    {
      fallbackType: "video/mp4",
      message: "AVI format may not be supported",
    },
  ],
  [
    "video/x-ms-wmv",
    {
      fallbackType: "video/mp4",
      message: "WMV format may not be supported",
    },
  ],
]);

// Helper function to get alternative IPFS gateway
const getAlternativeIPFSUrl = (
  uri: string,
  gatewayIndex: number = 0
): string => {
  const gateways = [
    "https://ipfs.io/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://dweb.link/ipfs/",
  ];

  if (uri.startsWith("ipfs://")) {
    const hash = uri.replace("ipfs://", "");
    return `${gateways[gatewayIndex % gateways.length]}${hash}`;
  }
  return uri;
};

export const MediaCard: React.FC<MediaCardProps> = ({
  id,
  media,
  name,
  isActive,
  volume24h,
  marketCapDelta24h,
  uniqueHolders,
  transfers,
  creator,
  symbol,
  volume,
  isLoading,
  tokenAddress,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [videoError, setVideoError] = React.useState<string | null>(null);
  const [currentGatewayIndex, setCurrentGatewayIndex] = React.useState(0);
  const [hasVideoFallback, setHasVideoFallback] = React.useState(false);
  const [currentMimeType, setCurrentMimeType] = React.useState(media?.mimeType);
  const [isMuted, setIsMuted] = React.useState(false); // Video starts unmuted
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const [isBuyDrawerOpen, setIsBuyDrawerOpen] = useState(false);

  // Memoized format function
  const formatNumber = useCallback((num: string) => {
    const n = parseFloat(num);
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toFixed(1);
  }, []);

  // Handle video click
  const handleVideoClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const video = videoRef.current;
      if (!video || videoError) return;

      if (video.paused) {
        video.play().catch(console.error);
      } else {
        video.pause();
      }
    },
    [videoError]
  );

  // Handle speaker icon click to toggle mute
  const handleSpeakerClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const video = videoRef.current;
      if (!video || videoError) return;

      video.muted = !video.muted;
      setIsMuted(video.muted);
    },
    [videoError]
  );

  // Update progress bar directly via DOM manipulation for native smoothness
  const updateProgress = useCallback(() => {
    const video = videoRef.current;
    const progressBar = progressBarRef.current;

    if (!video || !video.duration || !progressBar) return;

    // Additional safety checks for DOM elements
    if (!video.tagName || !progressBar.style) return;

    // Direct DOM manipulation - no React state, no re-renders
    const progress = (video.currentTime / video.duration) * 100;
    progressBar.style.width = `${progress}%`;
  }, []);

  // Handle video error and try alternative sources
  const handleVideoError = useCallback(
    (error: unknown) => {
      console.warn(`Video error for card ${id}:`, error);

      const video = videoRef.current;
      if (!video) return;

      // Try format fallback for problematic formats
      const formatInfo = PROBLEMATIC_FORMATS.get(currentMimeType || "");
      if (formatInfo && currentMimeType !== formatInfo.fallbackType) {
        console.log(`${formatInfo.message} for card ${id}`);
        setCurrentMimeType(formatInfo.fallbackType);
        setVideoError(null);
        return;
      }

      // Try alternative IPFS gateway
      if (media.originalUri.startsWith("ipfs://") && currentGatewayIndex < 3) {
        console.log(`Trying alternative IPFS gateway for card ${id}`);
        setCurrentGatewayIndex((prev) => prev + 1);
        return;
      }

      // If all attempts failed, show error state
      setVideoError("Video format not supported or failed to load");
      setHasVideoFallback(true);
    },
    [id, media.originalUri, currentGatewayIndex, currentMimeType]
  );

  // Reset error state when media changes
  useEffect(() => {
    setVideoError(null);
    setHasVideoFallback(false);
    setCurrentGatewayIndex(0);
    setCurrentMimeType(media?.mimeType);
  }, [media.originalUri, media?.mimeType]);

  // Main video control effect
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !media?.mimeType?.startsWith("video/") || videoError) return;

    // Additional safety check to ensure video element is properly initialized
    if (!video.tagName || video.tagName !== "VIDEO") return;

    // Check if video format needs special handling - reduced logging
    const formatInfo = PROBLEMATIC_FORMATS.get(currentMimeType || "");
    if (formatInfo && currentMimeType === media.mimeType) {
      // Only log once when first detected, not on every render
      console.debug(`${formatInfo.message} for card ${id}`);
    }

    // Event handler references for cleanup
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setIsMuted(video.muted);
    };
    const handleError = (e: Event) => {
      const target = e.target as HTMLVideoElement;
      handleVideoError(target.error);
    };
    const handleLoadError = () => {
      handleVideoError(new Error("Failed to load video"));
    };

    // Clean up function
    const cleanup = () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("timeupdate", updateProgress);
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadstart", handleLoadError);
    };

    // Add event listeners
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("timeupdate", updateProgress);
    video.addEventListener("error", handleError);

    if (isActive && !isLoading) {
      // Active card: always try unmuted play first

      // Cancel any pending play promise before starting new one
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {
          // Silently handle abort errors from previous play attempts
        });
      }

      // Always try unmuted play first
      video.muted = false;
      video.volume = 1.0;
      setIsMuted(false);
      playPromiseRef.current = video.play();

      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            console.log(`Playing video with audio for card ${id}`);
            playPromiseRef.current = null;
          })
          .catch((error) => {
            // Only log non-abort errors
            if (error.name !== "AbortError") {
              if (error.name === "NotAllowedError") {
                // Autoplay blocked - try muted as fallback
                console.debug(
                  `Autoplay blocked for card ${id}, trying muted playback`
                );
                video.muted = true;
                setIsMuted(true);
                const mutedPlayPromise = video.play();
                if (mutedPlayPromise) {
                  mutedPlayPromise.catch((e) => {
                    if (e.name !== "AbortError") {
                      console.error("Failed to play even when muted:", e);
                      handleVideoError(e);
                    }
                  });
                }
              } else {
                console.warn(`Failed to play video for card ${id}:`, error);
                // Fallback: try playing muted
                video.muted = true;
                setIsMuted(true);
                const mutedPlayPromise = video.play();
                if (mutedPlayPromise) {
                  mutedPlayPromise.catch((e) => {
                    if (e.name !== "AbortError") {
                      console.error("Failed to play even when muted:", e);
                      handleVideoError(e);
                    }
                  });
                }
              }
            }
            playPromiseRef.current = null;
          });
      }
    } else {
      // Inactive card: wait for any pending play promise before pausing
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            // Play succeeded, now we can safely pause
            video.pause();
            video.muted = true;
            setIsMuted(true);
            if (video.currentTime !== 0) {
              video.currentTime = 0;
            }
            setIsPlaying(false);
            // Reset progress bar directly
            if (progressBarRef.current) {
              progressBarRef.current.style.width = "0%";
            }
          })
          .catch(() => {
            // Play was aborted, still reset the video state
            video.muted = true;
            setIsMuted(true);
            if (video.currentTime !== 0) {
              video.currentTime = 0;
            }
            setIsPlaying(false);
            // Reset progress bar directly
            if (progressBarRef.current) {
              progressBarRef.current.style.width = "0%";
            }
          })
          .finally(() => {
            playPromiseRef.current = null;
          });
      } else {
        // No pending play promise, safe to pause immediately
        video.pause();
        video.muted = true;
        setIsMuted(true);
        if (video.currentTime !== 0) {
          video.currentTime = 0;
        }
        setIsPlaying(false);
        // Reset progress bar directly
        if (progressBarRef.current) {
          progressBarRef.current.style.width = "0%";
        }
      }
      console.log(`Paused video for card ${id}`);
    }

    return () => {
      cleanup();
      // Clear any pending play promise on unmount
      playPromiseRef.current = null;
    };
  }, [
    isActive,
    isLoading,
    media,
    id,
    updateProgress,
    videoError,
    handleVideoError,
  ]);

  if (!media) return null;

  // Video card with error fallback
  if (media.mimeType.startsWith("video/")) {
    // Show fallback if video failed to load
    if (hasVideoFallback || videoError) {
      return (
        <div className="media-card absolute inset-0 flex items-center justify-center bg-black rounded-2xl overflow-hidden">
          {/* Fallback to preview image if available */}
          {media.previewImage?.medium || media.previewImage?.small ? (
            <Image
              src={media.previewImage.medium || media.previewImage.small || ""}
              alt={name}
              className="w-full h-full object-contain"
              width={720}
              height={720}
              priority={isActive}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white/60 p-8">
              <svg
                className="w-16 h-16 mb-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <p className="text-center text-sm">Video unavailable</p>
              <p className="text-center text-xs mt-1 opacity-60">
                {videoError || "Format not supported"}
              </p>
            </div>
          )}

          {/* Stats sidebar */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <div className="text-sm text-white/60">24h Change</div>
              <div
                className={`text-lg font-medium ${
                  parseFloat(marketCapDelta24h) >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {parseFloat(marketCapDelta24h) >= 0 ? "+" : ""}
                {formatNumber(marketCapDelta24h)}%
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <div className="text-sm text-white/60">Holders</div>
              <div className="text-lg font-medium text-white">
                {formatNumber(uniqueHolders.toString())}
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <div className="text-sm text-white/60">Volume</div>
              <div className="text-lg font-medium text-white">
                ${formatNumber(volume)}
              </div>
            </div>

            {/* <BuyButton tokenAddress={tokenAddress} buyAmount="0.0001" /> */}
          </div>

          {/* Bottom info bar - adjusted for navbar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full overflow-hidden bg-white/10">
                <Image
                  src={
                    creator?.avatar?.previewImage?.small ||
                    "/default-avatar.png"
                  }
                  alt={creator?.handle || "Creator"}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white text-base font-medium">
                    {creator?.handle || "Anonymous"}
                  </span>
                  <span className="text-white/60">•</span>
                  <span className="text-white/60 text-sm truncate max-w-[120px]">
                    ${symbol}
                  </span>
                </div>
                <div className="text-white/80 text-sm truncate max-w-[200px]">
                  {name}
                </div>
              </div>

              {/* Buy Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBuyDrawerOpen(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Buy
              </button>
            </div>

            {/* Buy Drawer */}
            <BuyDrawer
              isOpen={isBuyDrawerOpen}
              onClose={() => setIsBuyDrawerOpen(false)}
              tokenSymbol={symbol}
              tokenName={name}
              tokenAddress={tokenAddress}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="media-card absolute inset-0 flex items-center justify-center bg-black rounded-2xl overflow-hidden">
        <video
          ref={videoRef}
          src={getAlternativeIPFSUrl(media.originalUri, currentGatewayIndex)}
          className="w-full h-full object-contain"
          loop
          playsInline
          onClick={handleVideoClick}
          onError={handleVideoError}
          preload="metadata"
          key={`${media.originalUri}-${currentMimeType}-${currentGatewayIndex}`}
        />

        {/* Play/Pause button */}
        <button
          onClick={handleVideoClick}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-all duration-200"
          style={{
            opacity: isPlaying ? 0 : 1,
            pointerEvents: isPlaying ? "none" : "auto",
          }}
          disabled={!!videoError}
        >
          <svg
            className="w-8 h-8 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        {/* Stats sidebar */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <div className="text-sm text-white/60">24h Change</div>
            <div
              className={`text-lg font-medium ${
                parseFloat(marketCapDelta24h) >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {parseFloat(marketCapDelta24h) >= 0 ? "+" : ""}
              {formatNumber(marketCapDelta24h)}%
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <div className="text-sm text-white/60">Holders</div>
            <div className="text-lg font-medium text-white">
              {formatNumber(uniqueHolders.toString())}
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <div className="text-sm text-white/60">Volume</div>
            <div className="text-lg font-medium text-white">
              ${formatNumber(volume)}
            </div>
          </div>

          {/* Buy Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsBuyDrawerOpen(true);
            }}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm hover:cursor-pointer font-medium rounded-lg transition-colors"
          >
            Buy
          </button>

          {/* <BuyButton tokenAddress={tokenAddress} buyAmount="0.0001" /> */}
        </div>

        {/* Bottom info bar - adjusted for navbar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-white/10">
              <Image
                src={
                  creator?.avatar?.previewImage?.small || "/default-avatar.png"
                }
                alt={creator?.handle || "Creator"}
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white text-base font-medium">
                  {creator?.handle || "Anonymous"}
                </span>
                <span className="text-white/60">•</span>
                <span className="text-white/60 text-sm truncate max-w-[120px]">
                  ${symbol}
                </span>
              </div>
              <div className="text-white/80 text-sm truncate max-w-[200px]">
                {name}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 w-full bg-white/20 h-1 rounded-full overflow-hidden">
            <div
              ref={progressBarRef}
              className="h-full bg-white"
              style={{
                width: "0%",
                transform: "translateZ(0)", // Force hardware acceleration
                willChange: "width", // Optimize for width changes
              }}
            />
          </div>
        </div>

        {/* Speaker icon at bottom right - adjusted for navbar */}
        <button
          onClick={handleSpeakerClick}
          className="absolute bottom-24 right-4 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all duration-200 z-10"
        >
          <div className="relative">
            <svg
              className="w-6 h-6 text-white drop-shadow-lg"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
            {/* Cross overlay when muted */}
            {isMuted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-500 drop-shadow-lg"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
        </button>

        {/* Buy Drawer */}
        <BuyDrawer
          isOpen={isBuyDrawerOpen}
          onClose={() => setIsBuyDrawerOpen(false)}
          tokenSymbol={symbol}
          tokenName={name}
          tokenAddress={tokenAddress}
        />
      </div>
    );
  }

  // Image card (unchanged)
  if (media.mimeType === "image/gif" || media.mimeType.startsWith("image/")) {
    return (
      <div className="media-card absolute inset-0 flex items-center justify-center bg-black rounded-2xl overflow-hidden">
        <Image
          src={getMediaUrl(media.originalUri)}
          alt={name}
          className="w-full h-full object-contain"
          width={720}
          height={720}
          priority={isActive}
        />

        {/* Stats sidebar for images */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          {[
            { label: "Volume", value: `$${formatNumber(volume24h)}` },
            {
              label: "24h Change",
              value: `${
                parseFloat(marketCapDelta24h) >= 0 ? "+" : ""
              }${formatNumber(marketCapDelta24h)}%`,
              color: parseFloat(marketCapDelta24h) >= 0 ? "#10b981" : "#ef4444",
            },
            { label: "Holders", value: formatNumber(uniqueHolders.toString()) },
            { label: "Transfers", value: formatNumber(transfers.toString()) },
          ].map(({ label, value, color }, i) => (
            <div
              key={i}
              className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 min-w-[120px]"
            >
              <div className="text-sm text-white/60">{label}</div>
              <div
                className="text-lg font-medium"
                style={{ color: color || "#fff" }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom info bar for images - adjusted for navbar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-white/10">
              <Image
                src={
                  creator?.avatar?.previewImage?.small || "/default-avatar.png"
                }
                alt={creator?.handle || "Creator"}
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white text-base font-medium">
                  {creator?.handle || "Anonymous"}
                </span>
                <span className="text-white/60">•</span>
                <span className="text-white/60 text-sm truncate max-w-[120px]">
                  ${symbol}
                </span>
              </div>
              <div className="text-white/80 text-sm truncate max-w-[200px]">
                {name}
              </div>
            </div>

            {/* Buy Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsBuyDrawerOpen(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Buy
            </button>
          </div>

          {/* Buy Drawer */}
          <BuyDrawer
            isOpen={isBuyDrawerOpen}
            onClose={() => setIsBuyDrawerOpen(false)}
            tokenSymbol={symbol}
            tokenName={name}
            tokenAddress={tokenAddress}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      Unsupported media type
    </div>
  );
};
