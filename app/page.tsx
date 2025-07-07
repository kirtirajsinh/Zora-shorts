import { MediaFeed } from "@/components/MediaFeed";

export default async function Home() {
  console.log(process.env.NEXT_PUBLIC_URL, "NEXT_PUBLIC_URL");
  
  let coins;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    coins = await fetch(
      `${baseUrl}/api/coins?limit=200&type=top-volume`,
      { cache: 'no-store' }
    );
    
    if (!coins.ok) {
      throw new Error(`HTTP error! status: ${coins.status}`);
    }
  } catch (error) {
    console.error('Failed to fetch coins:', error);
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white">Loading...</p>
      </div>
    );
  }
  
  const { zora20Tokens, pagination } = await coins.json();

  const tokensWithMedia = zora20Tokens.filter(
    (t: { mediaContent?: { originalUri: string } }) =>
      t.mediaContent && t.mediaContent.originalUri
  );

  return (
    <>
      <MediaFeed tokens={tokensWithMedia} pagination={pagination.cursor} coinType="top-volume" />
    </>
  );
}
