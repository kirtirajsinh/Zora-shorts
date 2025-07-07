"use client";

import { useEffect } from "react";
import { useTopGainersCoinsStore, useTopVolumeCoinsStore } from "@/store/useCoin";
import { Token } from "@/utils/coins";

type TrendingProviderProps = {
  children: React.ReactNode;
  initialGainers: Token[];
  initialVolume: Token[];
  gainersPagination?: string;
  volumePagination?: string;
};

export const TrendingProvider: React.FC<TrendingProviderProps> = ({
  children,
  initialGainers,
  initialVolume,
  gainersPagination,
  volumePagination,
}) => {
  const gainersStore = useTopGainersCoinsStore();
  const volumeStore = useTopVolumeCoinsStore();

  useEffect(() => {
    // Only initialize if stores are empty (no cache)
    if (gainersStore.coins.length === 0 && initialGainers.length > 0) {
      gainersStore.setCoins(initialGainers);
      gainersStore.setPagination(gainersPagination || null);
    }

    if (volumeStore.coins.length === 0 && initialVolume.length > 0) {
      volumeStore.setCoins(initialVolume);
      volumeStore.setPagination(volumePagination || null);
    }
  }, [initialGainers, initialVolume, gainersPagination, volumePagination, gainersStore, volumeStore]);

  return <>{children}</>;
};