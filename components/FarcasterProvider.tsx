"use client";

import React, { PropsWithChildren, useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import "@rainbow-me/rainbowkit/styles.css";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { useMiniAppStore } from "@/store/useMiniAppStore";

function FarcasterProvider({ children }: PropsWithChildren) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const {
    setUser,
    setIsAuthenticated,
    setIsAppAdded,
    setContext,
    setIsInMiniApp,
  } = useMiniAppStore();

  useEffect(() => {
    console.log("Loading Farcaster SDK");
    const load = async () => {
      try {
        console.log("Calling SDK ready");
        sdk.actions.ready();

        const isMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(isMiniApp);

        const miniAppUser = await sdk.context;
        console.log("SDK context:", miniAppUser);

        if (miniAppUser) {
          setContext(miniAppUser);

          if (miniAppUser?.user) {
            setUser({
              displayName: miniAppUser.user.displayName || "",
              fid: miniAppUser.user.fid,
              pfpUrl: miniAppUser.user.pfpUrl || "",
              username: miniAppUser.user.username || "",
            });
            setIsAuthenticated(true);
          } else {
            console.warn("No user found in SDK context");
          }

          if (miniAppUser?.client) {
            if (!miniAppUser.client.added) {
              try {
                const add = await sdk.actions.addMiniApp();
                if (add) {
                  console.log("Mini App Added");
                  setIsAppAdded(true);
                }
              } catch (addError) {
                console.error("Failed to add frame:", addError);
              }
            } else {
              setIsAppAdded(true);
            }
          }
        }

        setIsSDKLoaded(true);
      } catch (error) {
        console.error("Mini App initialization failed", error);
        setIsSDKLoaded(true);
      }
    };

    if (!isSDKLoaded) {
      load();
    }
  }, [setUser, setIsAuthenticated, setIsAppAdded, setContext, isSDKLoaded]);

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
        <FarcasterProvider>
          <RainbowKitProvider theme={darkTheme()} modalSize="compact">
            {children}
          </RainbowKitProvider>
        </FarcasterProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Provider;
