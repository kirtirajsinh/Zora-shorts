import React from "react";

const LoadingCard = () => {
  return (
    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
      {/* Center loading spinner */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
        <div className="text-white/80 text-lg font-medium">
          Loading Videos...
        </div>
      </div>

      {/* Bottom creator info matching MediaCard */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="h-5 w-32 bg-white/10 animate-pulse rounded" />
              <span className="text-white/60 text-lg">•</span>
              <div className="h-5 w-24 bg-white/10 animate-pulse rounded" />
            </div>
            <div className="flex flex-col gap-1 mt-1">
              <div className="h-5 w-48 bg-white/10 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="w-full bg-white/20 h-1">
          <div className="h-full bg-white/40 w-1/3 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default LoadingCard;
