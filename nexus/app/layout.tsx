import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Nexus | Collaborative Whiteboard with Google Meet Voice",
  description: "Define ideas, align on decisions, and talk effortlessly—all in one unified workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" data-scroll-behavior="smooth">
      <body className={`${inter.variable} font-sans antialiased selection:bg-primary-container`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}