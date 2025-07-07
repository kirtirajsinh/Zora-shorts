import { NextResponse } from "next/server";
import {
  getCoinsNew,
  getCoinsTopVolume24h,
  getCoinsTopGainers,
} from "@zoralabs/coins-sdk";
import { Token } from "@/utils/coins";

interface TokenPageInfo {
  hasNextPage: boolean;
  endCursor?: string;
}

interface EdgeNode {
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
}

interface Edge {
  node: EdgeNode;
}

async function searchTokenInSource(
  address: string,
  sourceFunction: Function,
  sourceName: string
): Promise<Token | null> {
  let hasNextPage = true;
  let cursor: string | undefined = undefined;
  let attempts = 0;
  const maxAttempts = 10; // Limit search attempts

  while (hasNextPage && attempts < maxAttempts) {
    attempts++;

    try {
      const response = await sourceFunction({
        count: 20, // Fetch more items per request
        after: cursor,
      });

      if (!response.data?.exploreList) {
        break;
      }

      const tokens = response.data.exploreList.edges
        .map((edge: Edge) => ({
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
        }))
        .filter((token: Token) =>
          token.mediaContent?.mimeType?.startsWith("video/")
        );

      // Search for the specific token address
      const foundToken = tokens.find(
        (token: Token) => token.address.toLowerCase() === address.toLowerCase()
      );

      if (foundToken) {
        console.log(`Token found in ${sourceName}:`, foundToken.address);
        return foundToken;
      }

      // Update pagination
      const pageInfo: TokenPageInfo = response.data.exploreList.pageInfo;
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
    } catch (error) {
      console.error(`Error searching in ${sourceName}:`, error);
      break;
    }
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!address) {
    return NextResponse.json(
      { error: "Token address is required" },
      { status: 400 }
    );
  }

  try {
    console.log(`Searching for token: ${address}`);

    // Search in all three data sources
    const searchPromises = [
      searchTokenInSource(address, getCoinsTopVolume24h, "top-volume"),
      searchTokenInSource(address, getCoinsTopGainers, "top-gainers"),
      searchTokenInSource(address, getCoinsNew, "new"),
    ];

    const results = await Promise.allSettled(searchPromises);

    // Find the first successful result
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        return NextResponse.json({
          token: result.value,
          source: "found",
        });
      }
    }

    // Token not found in any source
    console.log(`Token not found: ${address}`);
    return NextResponse.json(
      {
        error: "Token not found",
        message: "The requested token address was not found in any data source",
        address: address,
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching token:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch token",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
