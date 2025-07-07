import { MediaFeed } from "@/components/MediaFeed";

export default async function Home() {
  console.log(process.env.NEXT_PUBLIC_URL, "NEXT_PUBLIC_URL");
  const coins = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/coins?limit=200&type=top-volume`
  );
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
