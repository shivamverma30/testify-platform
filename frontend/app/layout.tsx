import type { Metadata } from "next";
import { DM_Mono, Sora, Syne } from "next/font/google";
import "./globals.css";

const bodySans = Sora({
  variable: "--font-body",
  subsets: ["latin"],
});

const displaySans = Syne({
  variable: "--font-display",
  subsets: ["latin"],
});

const dataMono = DM_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Testify | Premium NIMCET Prep Platform",
  description: "AI-powered premium mock test SaaS for NIMCET aspirants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodySans.variable} ${displaySans.variable} ${dataMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
