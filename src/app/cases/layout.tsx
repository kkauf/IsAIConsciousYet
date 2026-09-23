import { Newsreader } from "next/font/google";

// Quotes and titles are set in a serif: a case file is a record of what people said.
const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif" });

export default function CasesLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${serif.variable} flex-1 flex flex-col`}>{children}</div>;
}
