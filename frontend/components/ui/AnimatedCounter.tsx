"use client";

import { useEffect, useState } from "react";

type AnimatedCounterProps = {
  value: number;
  durationMs?: number;
};

export function AnimatedCounter({ value, durationMs = 900 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();

    const update = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setDisplayValue(Math.round(value * progress));

      if (progress < 1) {
        frame = window.requestAnimationFrame(update);
      }
    };

    frame = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [durationMs, value]);

  return <>{displayValue.toLocaleString("en-IN")}</>;
}
