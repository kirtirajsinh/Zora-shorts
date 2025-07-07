import { VideoGrid } from "@/components/VideoGrid";
import { TrendingProvider } from "@/components/TrendingProvider";

export default async function TrendingPage() {
  // Fetch both top gainers and top volume tokens server-side
  const [gainersResponse, volumeResponse] = await Promise.all([
    fetch(
      `${process.env.NEXT_PUBLIC_URL}/api/coins?limit=100&type=top-gainers`
    ),
    fetch(`${process.env.NEXT_PUBLIC_URL}/api/coins?limit=100&type=top-volume`),
  ]);

  const gainersData = await gainersResponse.json();
  const volumeData = await volumeResponse.json();

  // Filter tokens with media content
  const gainersWithMedia = gainersData.zora20Tokens.filter(
    (t: { mediaContent?: { originalUri: string } }) =>
      t.mediaContent && t.mediaContent.originalUri
  );

  const volumeWithMedia = volumeData.zora20Tokens.filter(
    (t: { mediaContent?: { originalUri: string } }) =>
      t.mediaContent && t.mediaContent.originalUri
  );

  return (
    <TrendingProvider
      initialGainers={gainersWithMedia}
      initialVolume={volumeWithMedia}
      gainersPagination={gainersData.pagination?.cursor}
      volumePagination={volumeData.pagination?.cursor}
    >
      <VideoGrid />
    </TrendingProvider>
  );
}
