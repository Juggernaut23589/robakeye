import type { Metadata } from "next";
import { Sora, Work_Sans, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import "./globals.css";

// Brand type stack per brand/tokens.json: Sora for display, Work Sans for
// body + prices (Sora lacks Naira sign and Yoruba diacritics; Work Sans has both).
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Robakeye — Pharmacy, Veterinary & Supermarket, Ibadan",
    template: "%s | Robakeye",
  },
  description:
    "Robakeye is a multi-vertical pharmacy, veterinary clinic and supermarket serving Ibadan across three branches: Ajadi, Ojoo and the Sheu flagship with full vet services.",
  icons: {
    icon: [
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/brand/apple-touch-icon-180.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${workSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-rk-bg text-rk-ink font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
