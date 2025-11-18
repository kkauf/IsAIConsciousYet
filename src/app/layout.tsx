import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import Image from "next/image";

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
  description: "Cast your vote to see what others think!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen w-full flex items-center justify-center bg-neutral-950 font-sans`}
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

        <div className="max-w-3xl w-full mx-auto px-4 py-8 rounded-3xl shadow-2xl border border-neutral-800/70 backdrop-blur-xl bg-neutral-900/80 text-neutral-100 flex flex-col min-h-[80vh] transition-all duration-500">
          <header className="w-full text-center mb-12 animate-fade-in">
            <div className="mx-auto w-full max-w-lg md:max-w-xl lg:max-w-2xl rounded-2xl shadow-lg overflow-hidden">
              <Image
                src="/hero-image.png"
                alt="Is AI Conscious Yet? Hero Image"
                width={800}
                height={600}
                className="w-full h-auto animate-fade-in"
                priority
              />
            </div>
            <p className="mt-4 text-neutral-400 text-lg md:text-xl font-medium tracking-wide max-w-2xl mx-auto animate-fade-in delay-100">
              Cast your vote to see what others think!
            </p>
          </header>

          <main className="flex-1 flex flex-col">{children}</main>

          <footer className="text-center text-xs text-neutral-500 mt-16 opacity-80 animate-fade-in delay-200">
            <p>© {new Date().getFullYear()} AI Consciousness Project</p>
            <p className="mt-1">
              This is a philosophical thought experiment. Results are not scientifically validated.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
