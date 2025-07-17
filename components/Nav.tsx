"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { useAccount, useDisconnect, useConnect, useSwitchChain } from "wagmi";
import { HomeIcon } from "@/components/icons/HomeIcon";
import { FireIcon } from "@/components/icons/FireIcon";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useMiniAppStore } from "@/store/useMiniAppStore";
import { base, baseSepolia } from "wagmi/chains";

const Nav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { disconnect } = useDisconnect();
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  const { isInMiniApp } = useMiniAppStore();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Custom Connect Button
  const CustomConnectButton = () => (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <button
          onClick={() => {
            if (isInMiniApp) {
              // In Mini App: Use direct connection with Mini App connector
              if (connectors[0]) {
                connect({ connector: connectors[0] });
              }
            } else {
              // Outside Mini App: Open RainbowKit modal
              openConnectModal();
            }
          }}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Connect
        </button>
      )}
    </ConnectButton.Custom>
  );

  return (
    // MODIFIED: Removed fixed, bottom-0, left-0, right-0, z-50. Added shrink-0 for flex context.
    // This div will now be constrained by its parent in RootLayout (max-w-[420px] mx-auto).
    <div className="h-16 bg-black shrink-0">
      {/* MODIFIED: Removed relative, max-w-[420px], mx-auto from nav.
          It will take the full width of its parent div (which is now correctly sized)
          and arrange its items. px-4 provides internal padding. */}
      <nav className="h-full flex items-center justify-between px-6">
        {/* Left Section - Home Icon */}
        <div className="flex items-center justify-center w-12 h-12">
          <button
            onClick={() => router.push("/")}
            className={`p-2 rounded-lg transition-colors ${
              pathname === "/"
                ? "text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <HomeIcon isActive={pathname === "/"} />
          </button>
        </div>

        {/* Center Navigation */}
        <div className="flex items-center justify-center space-x-6">
          {/* Fire button for trending videos */}
          <button
            onClick={() => router.push("/trending")}
            className={`p-2 rounded-lg transition-colors ${
              pathname === "/trending"
                ? "text-orange-500"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <FireIcon isActive={pathname === "/trending"} />
          </button>

          <button
            onClick={() => router.push("/zeero")}
            className={`px-3 py-2 text-lg font-bold rounded-lg transition-colors ${
              pathname === "/zeero"
                ? "text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Zeero
          </button>
        </div>

        {/* Right Section - User Wallet */}
        <div className="flex items-center justify-center min-w-[120px]">
          {isConnected && address ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm">
                    {formatAddress(address as string)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {chain?.name || "Unknown Chain"}
                  </span>
                </div>
              </button>
              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute bottom-full mb-2 right-0 w-52 bg-gray-800 rounded-lg shadow-lg py-1">
                  {/* Chain switching options */}
                  <div className="px-4 py-2 text-gray-300 text-xs font-medium border-b border-gray-700">
                    Switch Network
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await switchChain({ chainId: base.id });
                        setIsDropdownOpen(false);
                      } catch (error) {
                        console.error("Failed to switch to Base:", error);
                      }
                    }}
                    className={`w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center justify-between ${
                      chain?.id === base.id ? "bg-gray-700" : ""
                    }`}
                  >
                    <span>Base Mainnet</span>
                    {chain?.id === base.id && (
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    )}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await switchChain({ chainId: baseSepolia.id });
                        setIsDropdownOpen(false);
                      } catch (error) {
                        console.error(
                          "Failed to switch to Base Sepolia:",
                          error
                        );
                      }
                    }}
                    className={`w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center justify-between ${
                      chain?.id === baseSepolia.id ? "bg-gray-700" : ""
                    }`}
                  >
                    <span>Base Sepolia</span>
                    {chain?.id === baseSepolia.id && (
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    )}
                  </button>

                  {/* Logout option */}
                  <div className="border-t border-gray-700 mt-1">
                    <button
                      onClick={() => {
                        disconnect();
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <CustomConnectButton />
          )}
        </div>
      </nav>
    </div>
  );
};

export default Nav;
