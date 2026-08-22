import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Spectral } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-spectral",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Rental Underwriting Worksheet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spectral.variable} ${ibmPlexMono.variable}`}>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
