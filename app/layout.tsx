import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./lib/auth/context";
import { ToastProvider } from "./components/Toast";
import MemberstackScript from "./components/MemberstackScript";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Microburbs - Australia's Most Comprehensive Property Data",
  description: "Access the same data used by Australia's top buyer's agents. Street-level property insights, growth forecasts, and AI-powered property matching.",
  keywords: ["property data", "real estate", "Australia", "suburb reports", "property reports", "investment"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <MemberstackScript />
        <ToastProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
