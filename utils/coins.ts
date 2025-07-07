export type Token = {
    name: string;
    mediaContent: {
        mimeType: string;
        originalUri: string;
        previewImage?: {
            small?: string;
            medium?: string;
            blurhash?: string;
        };
    };
    volume24h?: number;
    marketCapDelta24h?: string;
    marketCap?: string;
    uniqueHolders?: number;
    transfers?: { count: number };
    totalVolume?: number;
    id: string;
    description: string;
    address: string;
    symbol: string;
    creatorAddress: string;
    tokenUri?: string;
    creator: {
        handle: string;
        avatar?: {
            previewImage?: {
                small?: string;
                medium?: string;
                blurhash?: string;
            };
        };
    };
};
