import type { Metadata } from "next";
import { JetBrains_Mono, Outfit, Syne } from "next/font/google";

import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "ShadowFlowBTC++",
  description: "Zero-knowledge private Bitcoin strategy execution system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${jetbrainsMono.variable} ${outfit.variable} min-h-screen bg-background text-foreground font-body antialiased`}
      >
        <ThemeProvider>
          <div className="min-h-screen">
            <Navbar />
            <div className="mx-auto flex max-w-[1400px]">
              <Sidebar />
              <div className="min-w-0 flex-1">{children}</div>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}