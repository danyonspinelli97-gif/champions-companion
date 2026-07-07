import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement> & { size?: number }) => ({
  width: p.size ?? 18,
  height: p.size ?? 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const X = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg {...base(p)}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
);
export const Plus = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg {...base(p)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
export const Star = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg {...base(p)}><polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9 12 2" /></svg>
);
export const Gear = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3.5a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5 8.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 6.6 1.6 1.6 0 0 0 10 5.1V5a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></svg>
);
export const ChevronDown = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg {...base(p)}><polyline points="6 9 12 15 18 9" /></svg>
);
export const ChevronUp = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg {...base(p)}><polyline points="6 15 12 9 18 15" /></svg>
);
