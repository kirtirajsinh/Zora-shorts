"use client";

import { useEffect } from "react";
import {
  useTopGainersCoinsStore,
  useTopVolumeCoinsStore,
} from "@/store/useCoin";
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
  gainersPagination,
}) => {
  const gainersStore = useTopGainersCoinsStore();
  const volumeStore = useTopVolumeCoinsStore();

  useEffect(() => {
    // Only initialize if stores are empty (no cache)
    if (gainersStore.coins.length === 0 && initialGainers.length > 0) {
      gainersStore.setCoins(initialGainers);
      gainersStore.setPagination(gainersPagination || null);
    }
  }, [initialGainers, gainersPagination, gainersStore]);

  return <>{children}</>;
};
