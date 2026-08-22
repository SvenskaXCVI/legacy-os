import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { PwaRegister } from "./pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";

  return {
    metadataBase: new URL(origin),
    title: {
      default: "Legacy OS",
      template: "%s · Legacy OS",
    },
    description:
      "The connected AI operating system for creative professionals.",
    icons: {
      icon: "/favicon.png",
      shortcut: "/favicon.png",
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      title: "Legacy OS",
      description: "Build your legacy. The system connects the rest.",
      url: origin,
      images: [
        {
          url: `${origin}/og.png`,
          width: 1733,
          height: 909,
          alt: "Legacy OS — the operating system for creative professionals",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Legacy OS",
      description: "Build your legacy. The system connects the rest.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const p=JSON.parse(localStorage.getItem("legacy_personalization")||"{}");const t=p.theme==="light"?"light":"dark";const a=["gold","amber","coral","rose","violet","blue","teal","emerald"].includes(p.accent)?p.accent:"gold";document.documentElement.dataset.theme=t;document.documentElement.dataset.accent=a;document.documentElement.style.colorScheme=t}catch(e){document.documentElement.dataset.theme="dark";document.documentElement.dataset.accent="gold"}`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
