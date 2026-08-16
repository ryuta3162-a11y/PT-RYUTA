import type { Metadata, Viewport } from "next";
import { TrainerGate } from "@/components/TrainerGate";

export const metadata: Metadata = {
  title: "work-admin",
  description: "スタッフ用トレーニング記録",
  applicationName: "work-admin",
  manifest: "/ops/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "WA",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/admin-192.png?v=wa3", sizes: "192x192", type: "image/png" },
      { url: "/icons/admin-512.png?v=wa3", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/ops-apple-touch-icon.png?v=wa3",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  other: {
    "apple-mobile-web-app-title": "WA",
  },
};

export const viewport: Viewport = {
  themeColor: "#222222",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <TrainerGate>{children}</TrainerGate>;
}
