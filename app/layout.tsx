import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Year in Review Review",
  description:
    "A curated collection of year-in-review blog posts from around the web. Browse posts by year, filter by author, and discover interesting year-end reflections from writers across the internet.",
  keywords: [
    "year in review",
    "annual review",
    "year-end reflection",
    "yearly summary",
    "year review",
  ],
  authors: [{ name: "Year in Review Review" }],
  creator: "Year in Review Review",
  openGraph: {
    type: "website",
    title: "Year in Review Review",
    description:
      "A curated collection of year-in-review blog posts from around the web",
    siteName: "Year in Review Review",
  },
  twitter: {
    card: "summary_large_image",
    title: "Year in Review Review",
    description:
      "A curated collection of year-in-review blog posts from around the web",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
