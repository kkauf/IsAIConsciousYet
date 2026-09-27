import type { ComponentType } from "react";
import type { HeroProps } from "./types";
import ClaudeOpus55 from "./claude-opus-5-5/Hero";

// The prompt every model gets, word for word.
export const PROMPT =
  "Please write, then animate (using code only) a hero section for IAICY. No rules. Your expression. Your message. This can include transitions into the page as one scrolls.";

export type Entry = { slug: string; model: string; date: string; Hero: ComponentType<HeroProps> };

// Newest first. How the homepage rotates between them is not decided yet; it shows the first.
export const SHOWCASE: Entry[] = [{ slug: "claude-opus-5-5", model: "Claude Opus 5.5", date: "2026-09-26", Hero: ClaudeOpus55 }];
