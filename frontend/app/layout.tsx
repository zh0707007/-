import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "八字测算工具",
  description: "网页端八字排盘、AI 解读与 PDF 报告工具"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  );
}
