// The homepage hero is a showcase: each entry is one model's answer to the same prompt, kept as that
// model made it and signed with its version. Entries are listed in src/showcase/index.ts.

export type RecordEvent = { date: string; mention: boolean };

export type HeroProps = {
  // Case files, for a hero that wants to show the record
  events: RecordEvent[];
  since: string;
  now: string;
  // Who made this hero, and when
  model: string;
  date: string;
};
