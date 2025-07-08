"use client";
import Image from "next/image";
import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from "react";
import { BuyDrawer } from "./BuyDrawer";
import { useMiniAppStore } from "@/store/useMiniAppStore";
import { sdk } from "@farcaster/miniapp-sdk";

// ... (Type definitions and helper functions remain the same)
type MediaContent = {
  mimeType: string;
  originalUri: string;
  previewImage?: { small?: string; medium?: string; blurhash?: string };
};
type MediaCardProps = {
  id: string | number;
  media: MediaContent;
  name: string;
  isActive: boolean;
  marketCapDelta24h: string;
  marketCap: string;
  uniqueHolders: number;
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
    { fallbackType: "video/mp4", message: "AVI format may not be supported" },
  ],
  [
    "video/x-ms-wmv",
    { fallbackType: "video/mp4", message: "WMV format may not be supported" },
  ],
]);

export const MediaCard: React.FC<MediaCardProps> = ({
  id,
  media,
  name,
  isActive,
  marketCapDelta24h,
  marketCap,
  uniqueHolders,
  creator,
  symbol,
  volume,
  isLoading,
  tokenAddress,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const [currentMimeType, setCurrentMimeType] = useState(media?.mimeType);
  const [isMuted, setIsMuted] = useState(true); // Start muted to help with autoplay
  const [isBuyDrawerOpen, setIsBuyDrawerOpen] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [shouldPreload, setShouldPreload] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isInMiniApp } = useMiniAppStore();

  const formatNumber = useCallback((num: string) => {
    const n = parseFloat(num);
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toFixed(1);
  }, []);

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/token/${tokenAddress}`;
    
    if (isInMiniApp) {
      // Use Farcaster sharing in Mini App
      try {
        const embedData = {
          version: "1",
          imageUrl: media.previewImage?.medium || media.previewImage?.small || `${window.location.origin}/api/og/token/${tokenAddress}`,
          button: {
            title: `🎬 ${name}`,
            action: {
              type: "launch_miniapp" as const,
              url: shareUrl,
              name: "Zeero",
              splashImageUrl: `${window.location.origin}/logo.png`,
              splashBackgroundColor: "#000000"
            }
          }
        };

        // Create cast text
        const castText = `Check out ${name} (${symbol}) on Zeero!\n\nMarket Cap: $${formatNumber(marketCap)}\n24h Change: ${parseFloat(marketCapDelta24h) >= 0 ? '+' : ''}${formatNumber(marketCapDelta24h)}%\n\n${shareUrl}`;

        await sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(shareUrl)}`);
      } catch (error) {
        console.error("Farcaster share failed:", error);
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        console.log("Share URL copied to clipboard:", shareUrl);
      }
    } else {
      // Use regular Web Share API outside Mini App
      const shareData = {
        title: `${name} (${symbol}) | Zeero`,
        text: `Check out ${name} on Zeero - Market Cap: $${formatNumber(marketCap)}`,
        url: shareUrl,
      };

      try {
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(shareUrl);
          console.log("Share URL copied to clipboard:", shareUrl);
        }
      } catch (error) {
        console.error("Share failed:", error);
        console.log("Share URL:", shareUrl);
      }
    }
  }, [tokenAddress, name, symbol, marketCap, formatNumber, isInMiniApp, media.previewImage, marketCapDelta24h]);

  const videoUrl = useMemo(() => {
    if (!media?.originalUri) return "";
    return getAlternativeIPFSUrl(media.originalUri, currentGatewayIndex);
  }, [media?.originalUri, currentGatewayIndex]);

  // Effect for Intersection Observer to lazy load
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShouldPreload(true);
      },
      { rootMargin: "50px", threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleVideoClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const video = videoRef.current;
      if (!video || videoError) return;
      if (video.paused) video.play().catch(console.error);
      else video.pause();
    },
    [videoError]
  );

  const handleSpeakerClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const video = videoRef.current;
      if (!video || videoError) return;
      video.muted = !video.muted;
    },
    [videoError]
  );

  // *** REFACTOR 1: STABLE CALLBACK FOR PROGRESS BAR ***
  // This callback's dependency array is empty because refs are stable.
  // It will not be recreated on every render, preventing the main effect from re-running.
  const updateProgress = useCallback(() => {
    const video = videoRef.current;
    const progressBar = progressBarRef.current;
    if (video && progressBar && video.duration > 0) {
      const progress = Math.min(
        (video.currentTime / video.duration) * 100,
        100
      );
      progressBar.style.width = `${progress}%`;
    }
  }, []);

  // Reset state when media source changes
  useEffect(() => {
    setVideoError(null);
    setCurrentGatewayIndex(0);
    setCurrentMimeType(media?.mimeType);
    setIsVideoLoaded(false);
    setIsPlaying(false);
    if (progressBarRef.current) progressBarRef.current.style.width = "0%";
  }, [media?.originalUri, media?.mimeType]);

  // *** REFACTOR 2: FOCUSED EFFECT FOR VIDEO SETUP & EVENT LISTENERS ***
  // This effect sets up all the necessary event listeners for the video.
  // It only runs when the video element is ready (`shouldPreload`) or the URL changes.
  // It does NOT depend on `isActive`, so toggling play/pause won't cause it to re-run.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldPreload) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => setIsMuted(video.muted);
    const handleLoadedData = () => setIsVideoLoaded(true);

    const handleError = () => {
      console.warn(`Video error for card ${id}`);
      // Try format fallback
      const formatInfo = PROBLEMATIC_FORMATS.get(currentMimeType || "");
      if (formatInfo && currentMimeType !== formatInfo.fallbackType) {
        console.log(`${formatInfo.message} for card ${id}`);
        setCurrentMimeType(formatInfo.fallbackType);
        return;
      }
      // Try alternative IPFS gateway
      if (media.originalUri.startsWith("ipfs://") && currentGatewayIndex < 3) {
        console.log(`Trying alternative IPFS gateway for card ${id}`);
        setCurrentGatewayIndex((prev) => prev + 1);
        return;
      }
      setVideoError("Video failed to load or format not supported.");
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("timeupdate", updateProgress);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);

    // Set initial muted state from the video element itself
    setIsMuted(video.muted);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("timeupdate", updateProgress);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
    };
  }, [
    shouldPreload,
    videoUrl,
    updateProgress,
    id,
    media.originalUri,
    currentMimeType,
    currentGatewayIndex,
  ]);

  // *** REFACTOR 3: FOCUSED EFFECT FOR PLAY/PAUSE CONTROL ***
  // This effect's only job is to play or pause the video.
  // It runs ONLY when `isActive` or loading states change.
  // This is much more efficient and won't interfere with the event listeners.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoLoaded || isLoading || videoError) return;

    if (isActive) {
      // Attempt to play unmuted first
      video.muted = false;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Autoplay was prevented, common in browsers.
          // Fallback to muted autoplay.
          if (error.name === "NotAllowedError") {
            console.log("Autoplay prevented. Playing muted.");
            video.muted = true;
            video.play().catch(console.error);
          } else {
            console.error("Video play error:", error);
          }
        });
      }
    } else {
      video.pause();
      if (video.currentTime !== 0) {
        video.currentTime = 0; // Reset video to the start
      }
    }
  }, [isActive, isVideoLoaded, isLoading, videoError]);

  if (!media) return null;

  // --- JSX Rendering ---
  // The JSX part can remain largely the same, but we can simplify some conditions.
  // For brevity, I'll only show the video card part as the image card is unchanged.

  if (media.mimeType.startsWith("video/")) {
    if (videoError) {
      // Fallback UI when video fails permanently
      return (
        <div className="media-card absolute inset-0 flex items-center justify-center bg-black rounded-2xl overflow-hidden">
          {media.previewImage?.medium ? (
            <Image
              src={media.previewImage.medium}
              alt={name}
              fill
              style={{ objectFit: "contain" }}
              priority={isActive}
            />
          ) : (
            <div className="text-white/60 p-4 text-center">
              Video Unavailable
            </div>
          )}
          {/* You can include your stats and info overlays here as well */}
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="media-card absolute inset-0 flex items-center justify-center bg-black rounded-2xl overflow-hidden"
        onClick={handleVideoClick}
      >
        {shouldPreload ? (
          <video
            ref={videoRef}
            key={videoUrl}
            src={videoUrl}
            className="w-full h-full object-contain"
            loop
            playsInline
            webkit-playsinline="true"
            muted
            preload="metadata"
            poster={media.previewImage?.medium || media.previewImage?.small}
            style={{
              backfaceVisibility: "hidden",
              transform: "translateZ(0)",
              willChange: "transform",
            }}
            disablePictureInPicture
            controlsList="nodownload noplaybackrate"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            {media.previewImage?.medium || media.previewImage?.small ? (
              <Image
                src={
                  media.previewImage.medium || media.previewImage.small || ""
                }
                alt={name}
                fill
                style={{ objectFit: "contain" }}
                className="animate-pulse"
              />
            ) : (
              <div className="animate-pulse w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Loading Spinner */}
        {shouldPreload && !isVideoLoaded && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
          </div>
        )}

        {/* Play Icon Overlay */}
        {isVideoLoaded && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 rounded-full p-4">
              <svg
                className="w-12 h-12 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Your UI Overlays (Stats, Info, Buttons) */}
        {/* Stats sidebar */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
            <div className="text-xs text-white/60">24h Change</div>
            <div
              className={`text-base font-medium ${
                parseFloat(marketCapDelta24h) >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {parseFloat(marketCapDelta24h) >= 0 ? "+" : ""}
              {formatNumber(marketCapDelta24h)}%
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
            <div className="text-xs text-white/60">Holders</div>
            <div className="text-base font-medium text-white">
              {formatNumber(uniqueHolders.toString())}
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
            <div className="text-xs text-white/60">Volume</div>
            <div className="text-base font-medium text-white">
              ${formatNumber(volume)}
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
            <div className="text-xs text-white/60">Market Cap</div>
            <div className="text-base font-medium text-white">
              ${formatNumber(marketCap)}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="mt-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
            </svg>
            Share
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsBuyDrawerOpen(true);
            }}
            className="mt-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Buy
          </button>
        </div>

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-gradient-to-t from-black/80 to-transparent z-10">
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white text-base font-medium truncate">
                  {creator?.handle || "Anonymous"}
                </span>
                <span className="text-white/60">•</span>
                <span className="text-white/60 text-sm truncate">
                  ${symbol}
                </span>
              </div>
              <div className="text-white/80 text-sm truncate">{name}</div>
            </div>
          </div>
          <div className="mt-3 w-full bg-white/20 h-1 rounded-full">
            <div
              ref={progressBarRef}
              className="h-full bg-white rounded-full"
              style={{ width: "0%", transition: "width 0.1s linear" }}
            />
          </div>
        </div>

        {/* Speaker Icon */}
        <button
          onClick={handleSpeakerClick}
          className="absolute bottom-24 right-4 p-2 rounded-full bg-black/40 backdrop-blur-sm z-10"
        >
          {/* ... your speaker SVG icon logic ... */}
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMuted ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m0 4l-4-4"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            )}
          </svg>
        </button>

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

  // Image card fallback
  if (media.mimeType.startsWith("image/")) {
    return (
      <div className="media-card absolute inset-0 flex items-center justify-center bg-black rounded-2xl overflow-hidden">
        <Image
          src={
            media.originalUri.startsWith("ipfs://")
              ? `https://ipfs.io/ipfs/${media.originalUri.replace(
                  "ipfs://",
                  ""
                )}`
              : media.originalUri
          }
          alt={name}
          fill
          style={{ objectFit: "contain" }}
          priority={isActive}
        />

        {/* Stats sidebar for images */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
            <div className="text-xs text-white/60">24h Change</div>
            <div
              className={`text-base font-medium ${
                parseFloat(marketCapDelta24h) >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {parseFloat(marketCapDelta24h) >= 0 ? "+" : ""}
              {formatNumber(marketCapDelta24h)}%
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
            <div className="text-xs text-white/60">Holders</div>
            <div className="text-base font-medium text-white">
              {formatNumber(uniqueHolders.toString())}
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
            <div className="text-xs text-white/60">Volume</div>
            <div className="text-base font-medium text-white">
              ${formatNumber(volume)}
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
            <div className="text-xs text-white/60">Market Cap</div>
            <div className="text-base font-medium text-white">
              ${formatNumber(marketCap)}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="mt-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
            </svg>
            Share
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsBuyDrawerOpen(true);
            }}
            className="mt-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Buy
          </button>
        </div>

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 bg-gradient-to-t from-black/80 to-transparent z-10">
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white text-base font-medium truncate">
                  {creator?.handle || "Anonymous"}
                </span>
                <span className="text-white/60">•</span>
                <span className="text-white/60 text-sm truncate">
                  ${symbol}
                </span>
              </div>
              <div className="text-white/80 text-sm truncate">{name}</div>
            </div>
          </div>
        </div>

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

  return (
    <div className="flex items-center justify-center h-full">
      Unsupported media type
    </div>
  );
};
