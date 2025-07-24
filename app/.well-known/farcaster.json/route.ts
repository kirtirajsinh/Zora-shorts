export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;
  const imageUrl = process.env.NEXT_PUBLIC_IMAGE_URL;
  const logoUrl = process.env.NEXT_PUBLIC_LOGO;
  const NEYNAR_CLIENT_ID = process.env.NEYNAR_CLIENT_ID;

  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjY4NjEsInR5cGUiOiJhdXRoIiwia2V5IjoiMHg0QjVhMDdkODFlNmNhYTAyOGFCODYwM2ExZTZhOEM1YmE3OEE2OWJiIn0",
      payload: "eyJkb21haW4iOiJ6ZWVyby1zaG9ydHMudmVyY2VsLmFwcCJ9",
      signature:
        "DG7ZZAsjCEe4ZI8oNAaa2CvtQstlczOPb2/vNKZpeCQKPPsq8XE2P9R7YM6O/wDD+Qn5j9/wBXYJC2Sds+XbIxw=",
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
