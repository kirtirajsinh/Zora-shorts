"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useWalletClient,
} from "wagmi";
import { parseEther, Address, Hex } from "viem";
import { toast } from "sonner";
import { createTradeCall, TradeParameters } from "@zoralabs/coins-sdk";

interface BuyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
}

export const BuyDrawer: React.FC<BuyDrawerProps> = ({
  isOpen,
  onClose,
  tokenSymbol,
  tokenName,
  tokenAddress,
}) => {
  const [amount, setAmount] = useState("0.0001");
  const [isLoading, setIsLoading] = useState(false);

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    if (isOpen) {
      setAmount("0.0001");
    }
  }, [isOpen]);

  const handleMultiply = (multiplier: number) => {
    const currentAmount = parseFloat(amount) || 0.0001;
    const newAmount = currentAmount * multiplier;
    setAmount(newAmount.toString());
  };

  const handleBuy = async () => {
    // Check wallet connection
    if (!isConnected || !address) {
      toast.error("Please connect your wallet to buy tokens");
      return;
    }

    if (!walletClient) {
      toast.error("Wallet not ready. Please try again.");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!tokenAddress) {
      toast.error("Token address not found");
      return;
    }

    setIsLoading(true);

    try {
      const tradeParameters: TradeParameters = {
        sell: {
          type: "eth",
        },
        buy: {
          type: "erc20",
          address: tokenAddress as Address,
        },
        amountIn: parseEther(amount), // Convert ETH amount to wei
        recipient: address as Address,
        slippage: 0.05, // 5% slippage
        sender: address as Address,
      };

      toast.loading("Preparing transaction...", { id: "buy-transaction" });

      const quote = await createTradeCall(tradeParameters);

      const tx = await walletClient.sendTransaction({
        to: quote.call.target as Address,
        data: quote.call.data as Hex,
        value: BigInt(quote.call.value),
        account: address as Address,
      });

      if (!tx) {
        toast.error("Transaction failed", { id: "buy-transaction" });
        return;
      }

      toast.success(`Successfully bought ${tokenSymbol}! Transaction sent.`, {
        id: "buy-transaction",
      });

      console.log("Transaction hash:", tx);

      onClose();
    } catch (error: any) {
      console.error("Buy failed:", error);

      let errorMessage = "Failed to buy tokens. Please try again.";
      if (error?.message?.includes("insufficient")) {
        errorMessage = "Insufficient ETH balance";
      } else if (error?.message?.includes("rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (error?.message?.includes("slippage")) {
        errorMessage = "Price changed too much. Please try again.";
      }

      toast.error(errorMessage, { id: "buy-transaction" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[420px] mx-auto">
        <div className="bg-gray-900 rounded-t-xl p-6 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-white">
                Buy ${tokenSymbol}
              </h3>
              <p className="text-sm text-gray-400">{tokenName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">
              Amount (ETH)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.0001"
              min="0.0001"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.0001"
            />
          </div>

          {/* Quick Multipliers */}
          <div className="mb-6">
            <div className="flex gap-2">
              {[2, 5, 10].map((multiplier) => (
                <button
                  key={multiplier}
                  onClick={() => handleMultiply(multiplier)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm"
                >
                  {multiplier}x
                </button>
              ))}
            </div>
          </div>

          {/* Buy Button */}
          <button
            onClick={handleBuy}
            disabled={
              isLoading || !amount || parseFloat(amount) <= 0 || !isConnected
            }
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : !isConnected ? (
              "Connect Wallet"
            ) : (
              `Buy ${amount} ETH`
            )}
          </button>
        </div>
      </div>
    </>
  );
};
