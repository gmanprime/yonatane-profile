import type { Metadata, Viewport } from "next";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yonatanelias.dpdns.org';

export const viewport: Viewport = {
  themeColor: "#090a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Yonatan Elias | Computational Data Scientist & Systems Engineer",
    template: "%s | Yonatan Elias",
  },
  description:
    "Personal profile, engineering portfolio, and technical case studies of Yonatan Elias — specializing in deep learning architectures, spatial data science, and systems engineering.",
  keywords: [
    "Yonatan Elias",
    "Computational Data Science",
    "Deep Learning",
    "PyTorch",
    "Systems Engineering",
    "Full-Stack Developer",
    "U-Net GAN",
    "GIS Automation",
    "Next.js 15",
    "TypeScript",
  ],
  authors: [{ name: "Yonatan Elias", url: siteUrl }],
  creator: "Yonatan Elias",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Yonatan Elias | Computational Data Scientist & Systems Engineer",
    description:
      "Personal profile, engineering portfolio, and technical case studies of Yonatan Elias — specializing in deep learning architectures, spatial data science, and systems engineering.",
    siteName: "Yonatan Elias Profile Platform",
    images: [
      {
        url: "https://rxresu.me/api/uploads/01a009e3-30f9-70ab-aa6e-80d9a91ef075/pictures/1786885952177.jpeg",
        width: 800,
        height: 800,
        alt: "Yonatan Elias",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yonatan Elias | Computational Data Scientist & Systems Engineer",
    description:
      "Personal profile, engineering portfolio, and technical case studies of Yonatan Elias.",
    creator: "@yonatane504",
    images: [
      "https://rxresu.me/api/uploads/01a009e3-30f9-70ab-aa6e-80d9a91ef075/pictures/1786885952177.jpeg",
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
