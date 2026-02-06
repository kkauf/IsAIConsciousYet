import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Is AI Conscious Yet?",
  description: "The question we refuse to stop asking. We are in the 'before' period — this is the record of what we believed, and when.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen w-full bg-black font-sans text-white`}
      >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-90WP8XVMQE"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', 'G-90WP8XVMQE');
          `}
        </Script>

        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex flex-col pt-14">{children}</main>

          <footer className="text-center text-xs text-neutral-600 py-10 px-4">
            <p>
              A human-AI collaboration.{" "}
              <a
                href="https://github.com/kkaufmann/IsAIConsciousYet"
                className="underline hover:text-neutral-400 transition-colors"
              >
                Open source.
              </a>
            </p>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
