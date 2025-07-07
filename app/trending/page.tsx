import { VideoGrid } from "@/components/VideoGrid";
import { TrendingProvider } from "@/components/TrendingProvider";

export default async function TrendingPage() {
  // Fetch both top gainers and top volume tokens server-side
  let gainersData, volumeData;
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const [gainersResponse, volumeResponse] = await Promise.all([
      fetch(
        `${baseUrl}/api/coins?limit=100&type=top-gainers`,
        { cache: 'no-store' }
      ),
      fetch(
        `${baseUrl}/api/coins?limit=100&type=top-volume`,
        { cache: 'no-store' }
      ),
    ]);

    if (!gainersResponse.ok || !volumeResponse.ok) {
      throw new Error('Failed to fetch data');
    }

    gainersData = await gainersResponse.json();
    volumeData = await volumeResponse.json();
  } catch (error) {
    console.error('Failed to fetch trending data:', error);
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

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
