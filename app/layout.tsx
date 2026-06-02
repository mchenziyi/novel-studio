import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { NovelProvider } from "@/lib/novel-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Novel Studio",
  description: "AI 驱动的小说写作平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <NovelProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-[#fafafa]">
              {children}
            </main>
          </div>
        </NovelProvider>
      </body>
    </html>
  );
}
