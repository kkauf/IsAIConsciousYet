import { allCases, getCase } from "@/lib/cases/load";

export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = () => allCases().map((c) => ({ slug: c.slug }));

// Served at /cases/<slug>.json through the rewrite in next.config.ts: a dynamic segment cannot carry a suffix.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const c = getCase((await params).slug);
  return c ? Response.json(c) : new Response("Not found", { status: 404 });
}
