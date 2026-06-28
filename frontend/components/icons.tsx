// Inline SVG icons from the design handoff. All use `currentColor` so the parent's
// text color controls them (e.g. text-white on accent buttons, text-ink-2 on light).

type IconProps = { className?: string; size?: number };

export function ArrowRight({ className, size = 17 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3.5 9h11M10 4.5L14.5 9 10 13.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronLeft({ className, size = 15 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M9.5 3.5L5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRight({ className, size = 16 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Shield({ className, size = 14 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.5l5.5 2v3.7c0 3.4-2.3 6-5.5 7.3-3.2-1.3-5.5-3.9-5.5-7.3V3.5L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function Download({ className, size = 15 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M9 3v8m0 0L5.5 7.5M9 11l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 12.5V14a1 1 0 001 1h9a1 1 0 001-1v-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FileDoc({ className, size = 20 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M11 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7l-5-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11 2v5h5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function SignOut({ className, size = 15 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M11.5 5.5V4a1.5 1.5 0 00-1.5-1.5H4A1.5 1.5 0 002.5 4v10A1.5 1.5 0 004 15.5h6a1.5 1.5 0 001.5-1.5v-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.5 9h8m0 0l-2.5-2.5M15.5 9L13 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertCircle({ className, size = 18 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 6v4.5M10 13.4v.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function CheckSmall({ className, size = 16 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M4 9.3l3.3 3.3L14 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Undo({ className, size = 15 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M6 4L2.5 7.5 6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 7.5H11a4.5 4.5 0 010 9H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Trash({ className, size = 15 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3.5 5h11M7.5 5V3.9a1 1 0 011-1h1a1 1 0 011 1V5M6.2 5l.5 9a1 1 0 001 1h2.6a1 1 0 001-1l.5-9M8 8v4M10 8v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
