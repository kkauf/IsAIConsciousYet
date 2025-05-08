import type { ReactNode } from "react";

interface AiConsciousnessLayoutProps {
  children: ReactNode;
}

export default function AiConsciousnessLayout({
  children,
}: AiConsciousnessLayoutProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-950 font-sans">
  <div className="max-w-3xl w-full mx-auto px-4 py-8 rounded-3xl shadow-2xl border border-neutral-800/70 backdrop-blur-xl bg-neutral-900/80 text-neutral-100 flex flex-col min-h-[80vh] transition-all duration-500">
      <header className="w-full text-center mb-12 animate-fade-in">
        <img
          src="/src/assets/hero-image.png"
          alt="Is AI Conscious Yet? Hero Image"
          className="mx-auto w-full max-w-lg md:max-w-xl lg:max-w-2xl rounded-2xl shadow-lg animate-fade-in"
        />
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
    </div>
  );
}
