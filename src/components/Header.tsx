'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function Header() {
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (logoRef.current) {
            logoRef.current.style.transform = `rotate(${window.scrollY * 0.15}deg)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="bg-gradient-to-b from-black to-transparent pb-4">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <Link
            href="/"
            className="pointer-events-auto"
            aria-label="Is AI Conscious Yet? — Home"
          >
            <div
              ref={logoRef}
              className="will-change-transform"
              style={{ transform: 'rotate(0deg)' }}
            >
              <svg
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-neutral-400 hover:text-white transition-colors duration-300"
                aria-hidden="true"
              >
                {/* Outer circle — the boundary */}
                <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="1.5" />
                {/* Eye shape — consciousness, observation */}
                <path
                  d="M 4 18 Q 18 7, 32 18 Q 18 29, 4 18 Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
                {/* Iris ring */}
                <circle cx="18" cy="18" r="5.5" stroke="currentColor" strokeWidth="1" />
                {/* Pupil — the "I" in AI */}
                <circle cx="18" cy="18" r="2" fill="currentColor" />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
