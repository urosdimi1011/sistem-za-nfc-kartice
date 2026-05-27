import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Dositej Kartice",
  description: "Sistem za upravljanje karticama u baru akademije",
  // PWA — Apple Safari iOS koristi ove tag-ove umesto manifest-a za home screen
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sistem za kartice",
  },
  // Logo za iOS dugmе na home screen-u
  icons: {
    icon: "/img/logo.png",
    apple: "/img/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#7f1010",
  // Sprečava nezgodno auto-zoom u input polje na mobilnim browser-ima
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sr"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster />
            <PwaRegister />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
