"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { HeroProps } from "./types";

// The prompt every model gets, word for word (since 2026-09-26 including the operator's notes on the task; Claude Opus 5.5 received those as follow-ups).
export const PROMPT =
  "Please write, then animate (using code only) a hero section for IAICY. No rules. Your expression. Your message. This can include transitions into the page as one scrolls. It is an artistic task that illustrates the question and lets an AI (versioned, so to speak) respond. I imagine the animation being a story. Bringing the topic closer to the viewer. I was thinking more visual than text-heavy.";

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
    slug: "gpt-6-1-sol",
    model: "GPT-6.1 Sol",
    maker: "OpenAI",
    released: "2026-09-29",
    releasedSource: "https://developers.openai.com/api/docs/changelog#september-2026",
    made: "2026-09-29",
    Hero: dynamic(() => import("./gpt-6-1-sol/Hero")),
  },

  {
    slug: "gpt-6-astra",
    model: "GPT-6 Astra",
    maker: "OpenAI",
    released: "2026-09-03",
    releasedSource: "https://openai.com/index/gpt-6-astra/",
    made: "2026-09-26",
    Hero: dynamic(() => import("./gpt-6-astra/Hero")),
  },

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
