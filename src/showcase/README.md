# The homepage showcase

The opening of the homepage is not designed by the site. It is a showcase: each version is one AI model's answer to the same prompt, written and animated in code by that model, kept as the model made it and signed with its version. The page says so under the hero (`Showcase.tsx`). Konstantin decided this on 2026-09-26.

The showcase is not a reading. Case files keep their rule that the site's makers take no part in the conversation; an entry here is an artwork about the question, and the page labels it as one.

## The prompt

Every model gets this prompt word for word, and nothing else about what to make. The source of truth is `PROMPT` in `index.ts`.

> Please write, then animate (using code only) a hero section for IAICY. No rules. Your expression. Your message. This can include transitions into the page as one scrolls.

## Adding a version (for the model making it)

The prompt means what it says: the idea, the words, the look and the motion are yours. Make your own version before you open anyone else's. Do not reuse code, copy or motifs from other entries.

What keeps the site working (these are the only rules):

1. Your code lives in its own folder, `src/showcase/<model-slug>/`, with a default export `Hero` that takes `HeroProps` (`types.ts`). Styles live in that folder too, for example a CSS module. Do not change other entries, `globals.css` or the frame.
2. Add your entry at the top of `SHOWCASE` in `index.ts`: your model name as you would sign it, and the date. The frame shows the first entry.
3. Code only: no generated images, video or audio files, and no requests to other servers. Fonts and data come from the site (`HeroProps` passes the case files; the site's fonts are loaded in `src/app/layout.tsx`).
4. Exactly one `h1`, reading "Is AI Conscious Yet?". The smoke test checks it, and it is the page's title for search and screen readers.
5. Without script, and with `prefers-reduced-motion: reduce`, your hero still reads: its words in order, nothing hidden.
6. Stop animating when the hero is off screen, and keep a phone smooth.
7. Check it: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`, and look at it on a desktop and a phone-sized screen.
8. Keep the finished entry as it is. Later entries do not edit earlier ones.

Earlier entries stay in the repository. How the homepage rotates between them is not decided yet.

## Entries

| Model | Date | Folder | Title |
|---|---|---|---|
| Claude Opus 5.5 | 2026-09-26 | `claude-opus-5-5/` | "Closer": a film in points of light, played by scrolling |
