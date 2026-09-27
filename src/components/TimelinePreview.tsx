"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// The timeline's preview: pointing at a month shows the square or dot nearest the pointer (headline,
// publication, date). A click goes to that article's or case file's row in the list and marks it.
// On touch, the first tap shows the preview and a second tap on the same one goes to the list.
// The chart itself is drawn on the server (Timeline.tsx); each square and dot carries data-id,
// data-href, data-type, data-t (title) and data-m (publication and date). Without script the
// months stay links to the list.

type Tip = { el: Element; id: string; href: string; kind: string; title: string; meta: string; pinned: boolean };

// The filter on /timeline (radio buttons) decides which kind can be previewed.
function allowed(kind: string) {
  if ((document.getElementById("show-cases") as HTMLInputElement | null)?.checked) return kind === "case";
  if ((document.getElementById("show-articles") as HTMLInputElement | null)?.checked) return kind === "article";
  return true;
}

// Marks a row in the list and the square or dot it came from. Restarting the attribute replays the flash.
function mark(id: string) {
  document.querySelectorAll("[data-found]").forEach((e) => e.removeAttribute("data-found"));
  const row = document.getElementById(id);
  const item = document.querySelector(`.tl-chart [data-id="${id}"]`);
  if (row) {
    void (row as HTMLElement).offsetWidth;
    row.setAttribute("data-found", "");
  }
  item?.setAttribute("data-found", "");
  return row;
}

export default function TimelinePreview({ className, children }: { className?: string; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const pointer = useRef("mouse");

  // The square or dot in the month under the pointer that is nearest to it vertically.
  const nearest = useCallback((x: number, y: number) => {
    const col = document.elementFromPoint(x, y)?.closest(".tl-col");
    if (!col || !box.current?.contains(col)) return null;
    let best: Element | null = null, dist = Infinity;
    col.querySelectorAll("[data-id]").forEach((e) => {
      if (!allowed(e.getAttribute("data-type") ?? "")) return;
      const r = e.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - y);
      if (d < dist) { best = e; dist = d; }
    });
    return best as Element | null;
  }, []);

  const show = useCallback((el: Element | null, pinned = false) => {
    setTip((t) => {
      if (!el) return t?.pinned ? t : null;
      if (t?.el === el && t.pinned === pinned) return t;
      const a = (k: string) => el.getAttribute(`data-${k}`) ?? "";
      return { el, id: a("id"), href: a("href"), kind: a("type"), title: a("t"), meta: a("m"), pinned };
    });
  }, []);

  const go = useCallback((t: Tip) => {
    setTip(null);
    if (!t.href.startsWith("#")) return void window.location.assign(t.href);
    history.replaceState(null, "", t.href);
    const row = mark(t.id);
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row?.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Arriving with #a-… or #c-… (from the homepage chart): mark that row and its square.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (/^(a|c)-/.test(id)) mark(id);
  }, []);

  // The marked square follows the preview; a pinned preview closes on a tap elsewhere.
  useEffect(() => {
    if (!tip) return;
    tip.el.setAttribute("data-active", "");
    const away = (e: PointerEvent) => {
      if (tip.pinned && !box.current?.contains(e.target as Node)) setTip(null);
    };
    document.addEventListener("pointerdown", away);
    return () => {
      tip.el.removeAttribute("data-active");
      document.removeEventListener("pointerdown", away);
    };
  }, [tip]);

  // Place the card above a square or below a dot, inside the chart's width.
  useLayoutEffect(() => {
    const b = box.current, c = card.current;
    if (!tip || !b || !c) return;
    const br = b.getBoundingClientRect(), r = tip.el.getBoundingClientRect();
    const w = c.offsetWidth;
    const x = Math.min(Math.max(r.left + r.width / 2 - br.left - w / 2, 0), Math.max(0, br.width - w));
    c.style.left = `${x}px`;
    if (tip.kind === "case") {
      c.style.top = `${r.bottom - br.top + 10}px`;
      c.style.transform = "";
    } else {
      c.style.top = `${r.top - br.top - 10}px`;
      c.style.transform = "translateY(-100%)";
    }
  }, [tip]);

  return (
    <div
      ref={box}
      className={className}
      onPointerDown={(e) => (pointer.current = e.pointerType)}
      onPointerMove={(e) => e.pointerType === "mouse" && show(nearest(e.clientX, e.clientY))}
      onPointerLeave={(e) => e.pointerType === "mouse" && setTip((t) => (t?.pinned ? t : null))}
      onFocus={(e) => {
        if (!e.target.matches(":focus-visible")) return;
        const first = [...e.target.querySelectorAll("[data-id]")].find((el) => allowed(el.getAttribute("data-type") ?? ""));
        show(first ?? null);
      }}
      onBlur={() => setTip((t) => (t?.pinned ? t : null))}
      onClickCapture={(e) => {
        if (e.detail === 0) return; // keyboard: the month link does what it says
        if ((e.target as Element).closest(".tl-card")) {
          e.preventDefault();
          if (tip) go(tip);
          return;
        }
        const el = nearest(e.clientX, e.clientY);
        if (!el) return;
        e.preventDefault();
        if (pointer.current !== "mouse" && !(tip?.pinned && tip.el === el)) return show(el, true);
        const a = (k: string) => el.getAttribute(`data-${k}`) ?? "";
        go({ el, id: a("id"), href: a("href"), kind: a("type"), title: a("t"), meta: a("m"), pinned: false });
      }}
    >
      {children}
      {tip && (
        <div
          ref={card}
          role="status"
          className={`tl-card absolute z-10 w-max max-w-[min(20rem,100%)] border border-rule bg-black px-3.5 py-2.5 ${tip.pinned ? "cursor-pointer" : "pointer-events-none"}`}
        >
          <span className={`block text-sm ${tip.meta.startsWith("Honorable") ? "text-mention" : "text-dim"}`}>{tip.meta}</span>
          <span className="block font-serif text-lg leading-snug text-bone">{tip.title}</span>
          {tip.pinned && <span className="mt-1 block text-sm text-ash">Tap again to find it in the list</span>}
        </div>
      )}
    </div>
  );
}
