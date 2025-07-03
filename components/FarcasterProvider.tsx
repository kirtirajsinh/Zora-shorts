"use client";

import React, { PropsWithChildren, useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import "@rainbow-me/rainbowkit/styles.css";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { useMiniAppStore } from "@/store/useMiniAppStore";

function FarcasterProvider({ children }: PropsWithChildren) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const { setIsInMiniApp } = useMiniAppStore();

  useEffect(() => {
    console.log("Loading Farcaster SDK");
    const load = async () => {
      try {
        console.log("Checking if in Mini App environment");
        // Check if we're in a Mini App environment
        const inMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(inMiniApp); // Store in Zustand

        if (inMiniApp) {
          console.log("In Mini App - calling ready");
          // Call ready as soon as possible to hide splash screen
          await sdk.actions.ready();
          setIsSDKLoaded(true);
        } else {
          console.log("Not in Mini App environment");
          setIsSDKLoaded(true);
        }
      } catch (error) {
        console.error("Mini App initialization failed", error);
        setIsInMiniApp(false); // Default to false on error
        setIsSDKLoaded(true);
      }
    };

    load();
  }, [setIsInMiniApp]);

  return <>{children}</>;
}

const queryClient = new QueryClient();

export const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_ENDPOINT),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_ENDPOINT),
  },
  connectors: [miniAppConnector(), injected()],
});

const Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()} modalSize="compact">
          <FarcasterProvider>{children}</FarcasterProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Provider;
