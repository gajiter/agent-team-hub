import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Team Hub",
  description: "Open-source file-based project management tool for AI agent team collaboration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background">{children}</body>
    </html>
  );
}
