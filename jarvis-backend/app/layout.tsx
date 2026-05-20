import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#050a10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Akasha — Sistema de Hogar Inteligente",
  description:
    "Panel de control del sistema Akasha: asistente de voz inteligente con IA, powered by Gemini 2.5 Flash.",
  keywords: ["Akasha", "hogar inteligente", "IoT", "Gemini", "asistente de voz"],
  authors: [{ name: "Proyecto Akasha" }],
  robots: "noindex, nofollow", // Panel privado
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Akasha",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
