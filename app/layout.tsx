import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai"],
  weight: "variable",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ทำเนียบสมาชิกชมรมยูโด | โรงเรียนนายร้อยตำรวจ",
  description:
    "ทำเนียบสมาชิกชมรมยูโด โรงเรียนนายร้อยตำรวจ ค้นหาและดูรายชื่อสมาชิกตามรุ่นและตำแหน่งในชมรม",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-navy-50 text-navy-950">{children}</body>
    </html>
  );
}
