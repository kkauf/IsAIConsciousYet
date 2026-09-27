"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { HeroProps } from "./types";

// The prompt every model gets, word for word.
export const PROMPT =
  "Please write, then animate (using code only) a hero section for IAICY. No rules. Your expression. Your message. This can include transitions into the page as one scrolls.";

export type Entry = {
  slug: string; // the entry's folder, and its ?v= address on the homepage
  model: string; // as the model signs itself
  maker: string;
  released: string; // the model's public release date, with the source in `releasedSource`
  releasedSource: string;
  made: string; // the day it made this hero
  Hero: ComponentType<HeroProps>;
};

// One line per model. Each hero loads only when it is shown.
const ENTRIES: Entry[] = [

  {
    slug: "claude-opus-5-5",
    model: "Claude Opus 5.5",
    maker: "Anthropic",
    released: "2026-09-22",
    releasedSource: "https://platform.claude.com/docs/en/models/opus-5-5/overview",
    made: "2026-09-26",
    Hero: dynamic(() => import("./claude-opus-5-5/Hero")),
  },
];

// Newest model first; the first is what the homepage shows by default.
export const SHOWCASE = [...ENTRIES].sort((a, b) => b.released.localeCompare(a.released));
