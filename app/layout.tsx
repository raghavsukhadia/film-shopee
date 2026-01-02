import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ReactQueryProvider } from "@/lib/react-query";
import GlobalErrorHandler from "@/components/GlobalErrorHandler";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Filmshoppee-Car (Zoravo OMS) - Car Accessories Management System",
  description: "Order Management System for Car Accessories Business",
  icons: {
    icon: '/favicon.ico',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GlobalErrorHandler />
        <ReactQueryProvider>
          {children}
          <Toaster />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
