import { createElement } from "react";
import icons from "@/data/report-icons.json";

// The report's existing Lucide SVGs, rendered without client components so the
// same markup can also be rendered into a PDF. See report-icons.LICENSE.
function icon(name: keyof typeof icons) {
  return function ReportIcon({ size = 24 }: { size?: number }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icons[name].map(([tag, props]) => createElement(tag as string, props as Record<string, string>))}
      </svg>
    );
  };
}

export const ArrowDownRight = icon("arrow-down-right");
export const ArrowUpRight = icon("arrow-up-right");
export const Check = icon("check");
export const CircleHelp = icon("circle-help");
export const Flag = icon("flag");
export const ShieldCheck = icon("shield-check");
export const Sprout = icon("sprout");
export const Waves = icon("waves");
