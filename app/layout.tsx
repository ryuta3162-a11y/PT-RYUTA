import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const noto = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto",
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "workout-log",
  description: "トレーニング記録アプリ",
  applicationName: "workout-log",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "WL",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${noto.variable} antialiased`}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
