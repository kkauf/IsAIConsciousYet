import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/Header";

const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"] });
const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://isaiconsciousyet.com"),
  title: "Is AI Conscious Yet?",
  description: "Nobody can say yet whether AI is conscious. A record of what people believe, and of what AI systems do that the usual story does not explain.",
  openGraph: { siteName: "Is AI Conscious Yet?", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${newsreader.variable} ${publicSans.variable} antialiased min-h-screen w-full bg-black font-sans text-bone`}
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
          <main className="flex-1 flex flex-col pt-16">{children}</main>

          <footer className="w-full max-w-6xl mx-auto px-6 pt-16 pb-10 text-sm text-dim">
            <p className="border-t border-rule pt-6">
              Made by a human and an AI together. The{" "}
              <a href="https://github.com/kkauf/IsAIConsciousYet" className="underline decoration-rule underline-offset-4 hover:text-bone">
                code and every case file
              </a>{" "}
              are public.
            </p>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
