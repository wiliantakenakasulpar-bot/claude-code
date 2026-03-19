import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "AutoVision Pro - Processamento Inteligente de Fotos Automotivas",
  description:
    "Transforme fotos reais de veículos em imagens profissionais de catálogo automotivo com inteligência artificial. Processamento em massa, organizado por placa.",
  keywords: "fotos veículos, processamento imagens automotivas, IA, remoção fundo, catálogo automotivo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-gray-50">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "12px",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
              fontSize: "14px",
              fontFamily: "Inter, system-ui, sans-serif",
            },
            success: {
              iconTheme: { primary: "#22c55e", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#fff" },
            },
          }}
        />
      </body>
    </html>
  );
}
