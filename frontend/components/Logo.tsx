// The Alma wordmark: a rounded "a" mark in the serif face + the "Alma" wordmark.

type LogoProps = {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "onAccent";
  className?: string;
};

const DIMS = {
  sm: { mark: 28, markFont: 17, word: 19, gap: 9 },
  md: { mark: 31, markFont: 19, word: 20, gap: 11 },
  lg: { mark: 34, markFont: 21, word: 23, gap: 11 },
} as const;

export function Logo({ size = "lg", variant = "default", className = "" }: LogoProps) {
  const d = DIMS[size];
  const markClass =
    variant === "onAccent" ? "bg-white/15 text-white" : "bg-accent text-white";
  const wordClass = variant === "onAccent" ? "text-[#eaf1ec]" : "text-ink";

  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: d.gap }}>
      <span
        className={`inline-flex items-center justify-center rounded-[9px] font-serif font-semibold leading-none ${markClass}`}
        style={{ width: d.mark, height: d.mark, fontSize: d.markFont }}
      >
        a
      </span>
      <span
        className={`font-serif font-semibold tracking-[-0.01em] ${wordClass}`}
        style={{ fontSize: d.word }}
      >
        Alma
      </span>
    </span>
  );
}
