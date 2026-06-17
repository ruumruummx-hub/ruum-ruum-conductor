import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ruum Ruum Conductor | By MoviliaX",
  description: "Aplicación para conductores certificados de Ruum Ruum by MoviliaX"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
