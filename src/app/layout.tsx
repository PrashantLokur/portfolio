import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prashant Lokur | EV Controls & Energy Management",
  description:
    "Automotive controls engineer and Industrial PhD researcher focused on BEV thermal management, energy optimization, model predictive control, and intelligent vehicle systems.",
  metadataBase: new URL("https://prashantlokur.com"),
  openGraph: {
    title: "Prashant Lokur | EV Controls & Energy Management",
    description:
      "Vehicle controls, BEV thermal management, energy optimization, and intelligent vehicle systems.",
    type: "website",
    images: ["/images/prashant.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
