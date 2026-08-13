import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3004";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const title = "Glimmerglen — A Tiny Enchanted Town";
  const description = "Build a storybook fantasy settlement where magic transforms the land.";
  return {
    title,
    description,
    openGraph: { title, description, images: [`${origin}/og-v2.png`] },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og-v2.png`] },
  };
}

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
