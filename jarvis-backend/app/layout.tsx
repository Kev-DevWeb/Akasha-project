import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Akasha — Sistema de Hogar Inteligente",
  description:
    "Panel de control del sistema Akasha: asistente de voz inteligente con IA, powered by Gemini 2.5 Flash.",
  keywords: ["Akasha", "hogar inteligente", "IoT", "Gemini", "asistente de voz"],
  authors: [{ name: "Proyecto Akasha" }],
  robots: "noindex, nofollow", // Panel privado
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
