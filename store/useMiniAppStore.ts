import { create } from "zustand";

// Types based on Farcaster Mini App SDK
interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  location?: {
    placeId: string;
    description: string;
  };
}

interface FarcasterContext {
  user: FarcasterUser;
  location?: {
    type: "cast_embed" | "cast_share" | "notification" | "launcher" | "channel";
    embed?: string;
    cast?: {
      author: FarcasterUser;
      hash: string;
      parentHash?: string;
      parentFid?: number;
      timestamp?: number;
      mentions?: FarcasterUser[];
      text: string;
      embeds?: string[];
      channelKey?: string;
    };
    notification?: {
      notificationId: string;
      title: string;
      body: string;
    };
    channel?: {
      key: string;
      name: string;
      imageUrl?: string;
    };
  };
  client: {
    clientFid: number;
    added: boolean;
    safeAreaInsets?: any;
    notificationDetails?: any;
  };
}

interface MiniAppState {
  // Basic state
  isInMiniApp: boolean;
  isLoading: boolean;

  // User context from Farcaster
  context: FarcasterContext | null;
  user: FarcasterUser | null;
  isAuthenticated: boolean;
  isAppAdded: boolean;

  // Actions
  setIsInMiniApp: (isInMiniApp: boolean) => void;
  setContext: (context: FarcasterContext) => void;
  setUser: (user: FarcasterUser | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsAppAdded: (isAdded: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;

  // SDK actions
  initializeMiniApp: () => Promise<void>;
  authenticateUser: () => Promise<void>;
  addMiniAppToFarcaster: () => Promise<void>;
  sendWebhookEvent: (
    eventType: string,
    userData: FarcasterUser
  ) => Promise<void>;
  reset: () => void;
}

export const useMiniAppStore = create<MiniAppState>((set, get) => ({
  // Initial state
  isInMiniApp: false,
  isLoading: false,
  context: null,
  user: null,
  isAuthenticated: false,
  isAppAdded: false,

  // Basic setters
  setIsInMiniApp: (isInMiniApp) => set({ isInMiniApp }),
  setContext: (context) => set({ context }),
  setUser: (user) => set({ user }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsAppAdded: (isAdded) => set({ isAppAdded: isAdded }),
  setIsLoading: (isLoading) => set({ isLoading }),

  // Initialize Mini App with context loading
  initializeMiniApp: async () => {
    set({ isLoading: true });

    try {
      // Check if we're in a Farcaster Mini App environment
      if (typeof window !== "undefined" && window.parent !== window) {
        // Try to access Farcaster Frame SDK
        const FrameSDK = (window as any).FrameSDK;

        if (FrameSDK) {
          set({ isInMiniApp: true });

          // Get context from Frame SDK
          const context = await FrameSDK.context;
          console.log("Farcaster context loaded:", context);

          if (context) {
            set({
              context,
              user: context.user || null,
              isAuthenticated: !!context.user,
              isAppAdded: context.client?.added || false,
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to initialize Mini App:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Authenticate user with Farcaster
  authenticateUser: async () => {
    try {
      const FrameSDK = (window as any).FrameSDK;

      if (!FrameSDK) {
        throw new Error("Frame SDK not available");
      }

      // Use Quick Auth (recommended approach)
      const result = await FrameSDK.actions.authenticate();

      if (result && result.user) {
        set({
          user: result.user,
          isAuthenticated: true,
        });

        console.log("User authenticated:", result.user);

        // Send webhook event for user authentication
        try {
          await get().sendWebhookEvent("user_authenticated", result.user);
        } catch (webhookError) {
          console.error("Failed to send authentication webhook:", webhookError);
          // Don't throw error for webhook failures
        }
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
  },

  // Add Mini App to user's Farcaster client
  addMiniAppToFarcaster: async () => {
    try {
      const FrameSDK = (window as any).FrameSDK;

      if (!FrameSDK) {
        throw new Error("Frame SDK not available");
      }

      // Add the Mini App to user's client
      await FrameSDK.actions.addMiniApp();

      set({ isAppAdded: true });
      console.log("Mini App added to Farcaster client");

      // Refresh context to get updated client info
      const context = await FrameSDK.context;
      if (context) {
        set({ context });
      }

      // Send webhook event for user adding Mini App
      const currentUser = get().user;
      if (currentUser) {
        try {
          await get().sendWebhookEvent("user_added", currentUser);
        } catch (webhookError) {
          console.error("Failed to send add Mini App webhook:", webhookError);
          // Don't throw error for webhook failures
        }
      }
    } catch (error) {
      console.error("Failed to add Mini App:", error);
      throw error;
    }
  },

  // Send webhook event to backend
  sendWebhookEvent: async (eventType: string, userData: FarcasterUser) => {
    try {
      const webhookData = {
        type: eventType,
        user: userData,
        clientFid: get().context?.client?.clientFid,
        timestamp: new Date().toISOString(),
        appId: "zeero-mini-app",
      };

      const response = await fetch("/api/webhook/farcaster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-zeero-client": "mini-app",
        },
        body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
        throw new Error(
          `Webhook failed: ${response.status} ${response.statusText}`
        );
      }

      console.log(`Webhook event '${eventType}' sent successfully`);
    } catch (error) {
      console.error("Failed to send webhook event:", error);
      throw error;
    }
  },

  // Reset store state
  reset: () =>
    set({
      isInMiniApp: false,
      isLoading: false,
      context: null,
      user: null,
      isAuthenticated: false,
      isAppAdded: false,
    }),
}));
