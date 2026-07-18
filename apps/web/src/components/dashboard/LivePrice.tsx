import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type PriceDirection = "up" | "down" | null;

export function LivePrice({ priceUsd, label }: { priceUsd: number; label: string }) {
  const previousPriceRef = useRef(priceUsd);
  const [direction, setDirection] = useState<PriceDirection>(null);

  useEffect(() => {
    const nextDirection = getPriceDirection(previousPriceRef.current, priceUsd);
    previousPriceRef.current = priceUsd;
    setDirection(nextDirection);

    if (nextDirection === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => setDirection(null), 500);
    return () => window.clearTimeout(timeoutId);
  }, [priceUsd]);

  return (
    <p
      role="status"
      className={cn(
        "mt-1 rounded-md text-3xl font-semibold tabular-nums",
        direction === "up" && "price-flash-up",
        direction === "down" && "price-flash-down",
      )}
      aria-label={label}
      data-price-direction={direction ?? "unchanged"}
    >
      ${priceUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}
    </p>
  );
}

export function getPriceDirection(previousPrice: number, currentPrice: number): PriceDirection {
  if (currentPrice > previousPrice) {
    return "up";
  }

  if (currentPrice < previousPrice) {
    return "down";
  }

  return null;
}
