import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "PT",
  description: "パーソナルトレーニング回数管理",
  applicationName: "PT",
  manifest: "/pta/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "PT",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/pta-192.png?v=pt3", sizes: "192x192", type: "image/png" },
      { url: "/icons/pta-512.png?v=pt3", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/pta-apple-touch-icon.png?v=pt3",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  other: {
    "apple-mobile-web-app-title": "PT",
  },
};

export const viewport: Viewport = {
  themeColor: "#8B0000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function PtaLayout({ children }: { children: React.ReactNode }) {
  return <div className="pta-app">{children}</div>;
}
