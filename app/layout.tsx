import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted by Next.js at build time: no request to Google from the browser, no layout shift.
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = { title: "QueuePro — Live Queue", description: "Fairer queues. Happier customers." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  );
}
