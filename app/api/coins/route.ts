import { NextResponse } from "next/server";
import {
  getCoinsNew,
  getCoinsTopVolume24h,
  getCoinsTopGainers,
} from "@zoralabs/coins-sdk";
import { Token } from "@/utils/coins";

type EdgeNode = {
  id: string;
  name?: string;
  description?: string;
  address: string;
  symbol?: string;
  totalSupply?: string;
  totalVolume?: string;
  volume24h?: string;
  createdAt?: string;
  creatorAddress?: string;
  marketCap?: string;
  marketCapDelta24h?: string;
  chainId: number;
  uniqueHolders?: number;
  tokenUri?: string;
  creatorProfile?: {
    handle?: string;
    avatar?: {
      previewImage?: {
        small?: string;
        medium?: string;
        blurhash?: string;
      };
    };
  };
  mediaContent?: {
    mimeType: string;
    originalUri: string;
    previewImage?: {
      small?: string;
      medium?: string;
      blurhash?: string;
    };
  };
  transfers?: {
    count: number;
  };
};

type Edge = {
  node: EdgeNode;
};

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Retry failed");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  console.log("Search Params:", searchParams);
  const limit = parseInt(searchParams.get("limit") || "1");
  const after = searchParams.get("after") || undefined;
  const type = searchParams.get("type") || "new"; // new, top-volume, top-gainers
  console.log(after, "after", type, "type");

  try {
    let zora20Tokens: Token[] = [];
    let paginationCursor = after;
    let attempts = 0;
    const maxAttempts = 5;

    while (zora20Tokens.length === 0 && attempts < maxAttempts) {
      attempts++;
      console.log(`Fetching attempt ${attempts}/${maxAttempts}`);

      const response = await retryWithBackoff(
        async () => {
          switch (type) {
            case "top-volume":
              return await getCoinsTopVolume24h({
                count: limit - zora20Tokens.length,
                after: paginationCursor,
              });
            case "top-gainers":
              return await getCoinsTopGainers({
                count: limit - zora20Tokens.length,
                after: paginationCursor,
              });
            case "new":
            default:
              return await getCoinsNew({
                count: limit - zora20Tokens.length,
                after: paginationCursor,
              });
          }
        },
        2,
        2000
      );

      // console.log('Raw Zora API Response:', JSON.stringify(response, null, 2));

      if (!response.data?.exploreList) {
        console.log("Failed to fetch coins", response);
        if (attempts >= maxAttempts) {
          throw new Error("Failed to fetch coins after multiple attempts");
        }
        continue;
      }

      const tokens = response.data.exploreList.edges.map((edge: any) => ({
        id: edge.node.id,
        name: edge.node.name || "Unnamed Token",
        description: edge.node.description || "",
        address: edge.node.address,
        symbol: edge.node.symbol || "",
        totalSupply: edge.node.totalSupply || "0",
        totalVolume: edge.node.totalVolume || "0",
        volume24h: edge.node.volume24h || "0",
        createdAt: edge.node.createdAt,
        creatorAddress: edge.node.creatorAddress,
        marketCap: edge.node.marketCap || "0",
        marketCapDelta24h: edge.node.marketCapDelta24h || "0",
        chainId: edge.node.chainId,
        uniqueHolders: edge.node.uniqueHolders || 0,
        tokenUri: edge.node.tokenUri,
        creator: {
          handle: edge.node.creatorProfile?.handle || "anonymous",
          avatar: edge.node.creatorProfile?.avatar || null,
        },
        mediaContent: edge.node.mediaContent || null,
        transfers: edge.node.transfers || { count: 0 },
      }));

      // Filter tokens with mimeType starting with 'video/'
      zora20Tokens = tokens?.filter((token) =>
        token.mediaContent?.mimeType?.startsWith("video/")
      );
      paginationCursor = response?.data?.exploreList?.pageInfo.endCursor;

      // If no video tokens found but we have a cursor, continue to next page
      if (
        zora20Tokens.length === 0 &&
        paginationCursor &&
        attempts < maxAttempts
      ) {
        console.log("No video tokens found in this batch, trying next page...");
        continue;
      }

      // Break if we found tokens or no more pages
      if (zora20Tokens.length > 0 || !paginationCursor) {
        break;
      }
    }

    zora20Tokens.reverse();

    // console.log('Processed Coins:', JSON.stringify(zora20Tokens, null, 2));

    return NextResponse.json({
      zora20Tokens,
      pagination: {
        cursor: paginationCursor,
      },
    });
  } catch (error) {
    console.error("Error fetching coins:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to fetch coins";
    if (error instanceof Error) {
      if (error.message.includes("ETIMEDOUT")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message.includes("ECONNREFUSED")) {
        errorMessage =
          "Connection refused. Service may be temporarily unavailable.";
      } else if (error.message.includes("fetch failed")) {
        errorMessage = "Network error. Please check your connection.";
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
