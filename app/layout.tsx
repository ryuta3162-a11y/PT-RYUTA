import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["600", "700", "800"],
});

const noto = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "PT RYUTA",
  description: "パーソナルトレーニング記録・メニュー共有アプリ",
  applicationName: "PT RYUTA",
  appleWebApp: {
    capable: true,
    title: "PT RYUTA",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#f3f5f7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${syne.variable} ${noto.variable} antialiased`}>
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}
