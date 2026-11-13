import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// DM Sans ships with the app (npm @fontsource-variable/dm-sans) instead of being downloaded from Google during the build:
// a network blip on the build machine once failed CI. next/font still preloads it and sizes the fallback font to avoid layout shift.
const dmSans = localFont({
  src: "../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  weight: "400 500",
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = { title: "QueuePro — Live Queue", description: "Fairer queues. Happier customers." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  );
}
