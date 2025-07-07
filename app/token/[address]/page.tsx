import { MediaCard } from "@/components/MediaCard";
import { Token } from "@/utils/coins";
import { Metadata } from "next";
import { notFound } from "next/navigation";

interface TokenPageProps {
  params: {
    address: string;
  };
}

async function getToken(address: string): Promise<Token | null> {
  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/token/${address}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Error fetching token:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: TokenPageProps): Promise<Metadata> {
  const token = await getToken(params.address);

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

export default async function TokenPage({ params }: TokenPageProps) {
  const token = await getToken(params.address);

  if (!token) {
    notFound();
  }

  return (
    <div className="h-full w-full relative overflow-hidden bg-black cursor-pointer">
      <div className="absolute top-0 left-0 w-full bottom-16">
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
