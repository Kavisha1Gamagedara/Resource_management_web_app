import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SessionProvider } from "@/components/auth/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrimeWave Lab | Resource Reservation Management System",
  description:
    "Centralized enterprise resource reservation management system with real-time conflict prevention, role-based access control, and intuitive availability schedules.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col bg-zinc-50/50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans`}
      >
        <SessionProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8">
            {children}
          </main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
