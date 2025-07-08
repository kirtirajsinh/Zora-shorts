export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;
  const imageUrl = process.env.NEXT_PUBLIC_IMAGE_URL;
  const logoUrl = process.env.NEXT_PUBLIC_LOGO;
  const NEYNAR_CLIENT_ID = process.env.NEYNAR_CLIENT_ID;

  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjY4NjEsInR5cGUiOiJhdXRoIiwia2V5IjoiMHg0QjVhMDdkODFlNmNhYTAyOGFCODYwM2ExZTZhOEM1YmE3OEE2OWJiIn0",
      payload: "eyJkb21haW4iOiJ6ZWVyby5jb29sIn0",
      signature:
        "RZ+92uyf6e9g7PpkDn5Y/Zodi8rEc6j0c/dUPpNGgdFp/vAlF40C2+2HyJaJ7usr1WvgopzxnAT/IQqoI/4vCRs=",
    },

    frame: {
      version: "1",
      name: "Zeero",
      iconUrl: `${logoUrl}`,
      homeUrl: `${appUrl}`,
      imageUrl: `${imageUrl}`,
      description: "Share your videos and earn from them (zora)",
      buttonTitle: "Start at Zeero",
      splashImageUrl: `${logoUrl}`,
      splashBackgroundColor: "#FFFFFF",
      webhookUrl: `https://api.neynar.com/f/app/${NEYNAR_CLIENT_ID}/event`,
    },
  };

  return Response.json(config);
}
