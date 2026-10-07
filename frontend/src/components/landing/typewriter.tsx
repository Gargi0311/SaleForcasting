"use client";

import { useEffect, useState } from "react";

/** Types a phrase, strikes it through, then deletes it and moves to the next one. */
export function StrikeTypewriter({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">("typing");
  const phrase = phrases[index];

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLength(phrase.length);
      setPhase("holding");
      return;
    }
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      t = length < phrase.length ? setTimeout(() => setLength((l) => l + 1), 55) : setTimeout(() => setPhase("holding"), 150);
    } else if (phase === "holding") {
      t = setTimeout(() => setPhase("deleting"), 2200);
    } else {
      t = length > 0 ? setTimeout(() => setLength((l) => l - 1), 28) : setTimeout(() => {
        setIndex((i) => (i + 1) % phrases.length);
        setPhase("typing");
      }, 250);
    }
    return () => clearTimeout(t);
  }, [length, phase, phrase, phrases.length]);

  return (
    <span aria-label={phrase}>
      <span className={phase === "holding" ? "strike" : "muted"} aria-hidden>
        {phrase.slice(0, length)}
      </span>
      <span className="caret" aria-hidden />
    </span>
  );
}
