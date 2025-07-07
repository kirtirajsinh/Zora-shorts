import { create } from "zustand";
import { Token } from "@/utils/coins";

interface CoinsStore {
  coins: Token[];
  pagination: string | null;
  setCoins: (coins: Token[]) => void;
  setPagination: (cursor: string | null) => void;
  updateCurrentCoinIndex: (direction: "up" | "down") => Promise<void>;
  isLoading: boolean;
  setLoading: (isLoading: boolean) => void;
  setCurrentCoinIndex: (index: number) => void;
  currentCoinIndex: number;
  loadMoreCoins: (coinType: "new" | "top-volume" | "top-gainers") => Promise<void>;
  hasMore: boolean;
  reset: () => void;
}

// Base store factory
const createCoinsStore = (coinType: "new" | "top-volume" | "top-gainers") => 
  create<CoinsStore>((set, get) => ({
    coins: [],
    pagination: null,
    isLoading: false,
    currentCoinIndex: 0,
    hasMore: true,

    setLoading: (isLoading: boolean) => set({ isLoading }),
    setCoins: (coins) => set({ coins }),
    setPagination: (cursor) => set({ pagination: cursor, hasMore: !!cursor }),
    setCurrentCoinIndex: (index) => set({ currentCoinIndex: index }),
    reset: () => set({ coins: [], pagination: null, currentCoinIndex: 0, hasMore: true, isLoading: false }),

    updateCurrentCoinIndex: async (direction: "up" | "down") => {
      const {
        coins,
        pagination,
        currentCoinIndex,
        isLoading,
        hasMore,
      } = get();

      const loadMoreCoins = get().loadMoreCoins;

      if (direction === "up") {
        // Prevent multiple loading attempts
        if (isLoading) {
          console.log("Already loading, swipe ignored.");
          return;
        }

        // Check if we're at the last real card
        if (currentCoinIndex === coins.length - 1) {
          // If we have more to load, trigger loading
          if (hasMore && pagination) {
            console.log("At last card, loading more...");
            // Move to loading slot immediately
            set({ currentCoinIndex: coins.length });
            await loadMoreCoins(coinType);
          } else {
            console.log("No more coins to load");
          }
        } else if (currentCoinIndex < coins.length) {
          // Normal navigation within loaded coins
          set({ currentCoinIndex: currentCoinIndex + 1 });
        }
      } else if (direction === "down") {
        if (currentCoinIndex > 0) {
          set({ currentCoinIndex: currentCoinIndex - 1 });
        }
      }
    },

    loadMoreCoins: async (requestedCoinType: "new" | "top-volume" | "top-gainers") => {
      const { pagination, coins, isLoading } = get();

      if (!pagination || isLoading) {
        console.log("Cannot load more: no pagination or already loading");
        return;
      }

      set({ isLoading: true });

      try {
        console.log("Fetching more coins with cursor:", pagination, "type:", requestedCoinType);
        const response = await fetch(`/api/coins?limit=200&after=${pagination}&type=${requestedCoinType}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !data.zora20Tokens || data.zora20Tokens.length === 0) {
          console.log("No new coins received");
          set({
            isLoading: false,
            hasMore: false,
            currentCoinIndex: coins.length - 1, // Go back to last card
          });
          return;
        }

        console.log(`Received ${data.zora20Tokens.length} new coins`);

        set((state) => ({
          coins: [...state.coins, ...data.zora20Tokens],
          pagination: data.pagination?.cursor || null,
          hasMore: !!data.pagination?.cursor,
          isLoading: false,
          // currentCoinIndex stays at the first new coin
        }));
      } catch (error) {
        console.error("Error loading more coins:", error);
        set((state) => ({
          isLoading: false,
          currentCoinIndex: Math.max(0, state.coins.length - 1), // Go back to last valid card
        }));
      }
    },
  }));

// Create separate stores for each coin type
export const useNewCoinsStore = createCoinsStore("new");
export const useTopVolumeCoinsStore = createCoinsStore("top-volume");
export const useTopGainersCoinsStore = createCoinsStore("top-gainers");

// Legacy export for backward compatibility
export const useCoinsStore = useNewCoinsStore;