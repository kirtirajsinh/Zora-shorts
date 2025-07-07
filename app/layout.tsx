import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
const Provider = dynamic(() => import("@/components/FarcasterProvider"));
// import NavBar from "@/components/NavBar";
import { Toaster } from "sonner";
import Nav from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata() {
  const appUrl = process.env.NEXT_PUBLIC_URL;
  const imageUrl = process.env.NEXT_PUBLIC_IMAGE_URL;
  const logoUrl = process.env.NEXT_PUBLIC_LOGO;
  return {
    title: "Zeero",
    description: "Creators from  Zeero to Millionaire",
    openGraph: {
      title: `Zeero`,
      description: `Creators from  Zeero to Millionaire`,

      images: [
        {
          url: `${imageUrl}`,
          width: 800,
          height: 600,
        },
      ],
    },
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: `${imageUrl}`,
        button: {
          title: "Start at Zeero",
          action: {
            type: "launch_frame",
            name: "zeero",
            url: `${appUrl}`,
            splashImageUrl: `${logoUrl}`,
            splashBackgroundColor: "#FFFFFF",
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-black text-white`}
      >
        <Provider>
          {/* 
              This div is the main viewport container for the TikTok-style feed.
              - max-w-[420px]: Limits width, like a mobile screen.
              - mx-auto: Centers the container horizontally.
              - h-screen: Makes the container take the full viewport height.
              - flex flex-col: Arranges children (main content and NavBar) vertically.
              - overflow-hidden: Prevents scrollbars on this container itself, as scrolling
                is handled within the children (e.g., MediaFeed) or by NavBar positioning.
            */}
          <div className="max-w-[420px] mx-auto h-screen flex flex-col relative">
            {/*
                This main tag will hold the page content (e.g., MediaFeed).
                - flex-grow: Allows this element to expand and take available vertical space.
                - relative: Useful if children inside need absolute positioning relative to this content area.
                - overflow-hidden: Ensures that content within MediaFeed (like the transforming list)
                  is clipped correctly and doesn't cause scrollbars on this main element.
              */}
            <main className="flex-grow relative ">{children}</main>
            {/* Nav will be at the bottom of the flex-col container */}
            <div className="fixed max-w-[420px] mx-auto bottom-0 left-0 right-0">
              <Nav />
            </div>
            <Toaster />
          </div>
        </Provider>
      </body>
    </html>
  );
}
