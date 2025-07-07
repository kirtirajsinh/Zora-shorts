import { MediaCard } from "@/components/MediaCard";
import { Token } from "@/utils/coins";
import { Metadata } from "next";
import { notFound } from "next/navigation";

// NEW: Define a complete props type for Next.js 15+
type Props = {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getToken(address: string): Promise<Token | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/token/${address}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      console.error(`Failed to fetch token: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Error fetching token:", error);
    return null;
  }
}

// USE THE NEW PROPS TYPE
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const token = await getToken(address);

  // ... (rest of the function is fine, no changes needed here)
  if (!token) {
    return {
      title: "Token Not Found | Zeero",
      description: "The requested token could not be found.",
    };
  }

  const title = `${token.name} (${token.symbol}) | Zeero`;
  const description =
    token.description ||
    `Check out ${token.name} on Zeero - Market Cap: $${parseFloat(
      token.marketCap || "0"
    ).toLocaleString()}`;
  const imageUrl =
    token.mediaContent?.previewImage?.medium ||
    token.mediaContent?.previewImage?.small;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: `${token.name} preview`,
            },
          ]
        : [],
      type: "article",
      siteName: "Zeero",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

// USE THE NEW PROPS TYPE
export default async function TokenPage({ params }: Props) {
  const { address } = await params;
  const token = await getToken(address);

  if (!token) {
    notFound();
  }

  return (
    <div className="h-full w-full relative overflow-hidden bg-black cursor-pointer">
      <div className="absolute top-0 left-0 w-full h-full">
        <MediaCard
          id={token.id}
          media={token.mediaContent}
          name={token.name}
          isActive={true}
          marketCapDelta24h={String(token.marketCapDelta24h || "0")}
          marketCap={String(token.marketCap || "0")}
          uniqueHolders={token.uniqueHolders || 0}
          creator={token.creator}
          description={token.description}
          symbol={token.symbol}
          volume={String(token.totalVolume || "0")}
          isLoading={false}
          tokenAddress={token.address}
        />
      </div>
    </div>
  );
}
