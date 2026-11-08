
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { EndingType, Level } from "@/content/schema";
import { ENDING_TYPE_META } from "@/lib/config";

/* --------------------------------------------------
   Utility
-------------------------------------------------- */

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* --------------------------------------------------
   Level badge
-------------------------------------------------- */

const LEVEL_COLORS: Record<Level, string> = {
  1: "bg-matcha",
  2: "bg-sky",
  3: "bg-plum",
};

export function LevelBadge({
  level,
  className,
}: {
  level: Level;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-display text-xs font-extrabold text-white shadow-sm",
        LEVEL_COLORS[level],
        className,
      )}
    >
      Lv {level}
    </span>
  );
}

/* --------------------------------------------------
   Ending type badge
-------------------------------------------------- */

export function EndingTypeBadge({
  type,
  hidden,
}: {
  type: EndingType;
  hidden?: boolean;
}) {
  const meta = ENDING_TYPE_META[type];

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wider"
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.icon} {hidden ? "???" : meta.label}
    </span>
  );
}

/* --------------------------------------------------
   Ending progress dots
-------------------------------------------------- */

export function EndingDots({
  found,
  total,
  size = "sm",
}: {
  found: number;
  total: number;
  size?: "sm" | "md";
}) {
  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={`${found} of ${total} endings found`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cx(
            "rounded-full border-2",
            size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5",
            i < found
              ? "border-sakura bg-sakura"
              : "border-ink/20 bg-transparent",
          )}
        />
      ))}
    </span>
  );
}

/* --------------------------------------------------
   Reusable button
-------------------------------------------------- */

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "dark";
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
};

export function Button({
  children,
  onClick,
  href,
  variant = "primary",
  className,
  disabled,
  ariaLabel,
}: BtnProps) {
  const cls = cx(
    "inline-flex select-none items-center justify-center gap-2 rounded-2xl px-4 py-3 font-display text-[15px] font-extrabold transition active:scale-[0.97] disabled:opacity-40",
    variant === "primary" &&
      "bg-sakura text-white shadow-[0_4px_0_#154940] hover:brightness-105",
    variant === "secondary" &&
      "border-2 border-ink/10 bg-white text-ink shadow-[0_3px_0_rgba(43,35,64,0.12)] hover:border-ink/20",
    variant === "ghost" && "text-ink-soft hover:bg-ink/5",
    variant === "dark" && "bg-ink text-white shadow-[0_4px_0_#130f20]",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cls}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        onClick={disabled ? (e) => e.preventDefault() : undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cls}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------
   Bottom navigation
-------------------------------------------------- */

const NAV = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/stories", label: "Stories", icon: "stories" },
  { href: "/speak", label: "Speak", icon: "speak" },
  { href: "/notebook", label: "Notebook", icon: "notebook" },
];

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";

  if (href === "/stories") {
    return (
      pathname.startsWith("/stories") ||
      pathname.startsWith("/story") ||
      pathname.startsWith("/play")
    );
  }

  return pathname.startsWith(href);
}

function NavIcon({
  type,
  active,
}: {
  type: string;
  active: boolean;
}) {
  const color = active ? "#F8D98A" : "#D5E4D9";
  const dark = active ? "#B99145" : "#6D9A83";
  const highlight = active ? "#FFF0C4" : "#F5F0DF";

  return (
    <svg
      viewBox="0 0 40 40"
      width="30"
      height="30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="transition-transform duration-200 group-hover:-translate-y-0.5"
    >
      <defs>
        <linearGradient
          id={`front-${type}`}
          x1="8"
          y1="5"
          x2="30"
          y2="35"
        >
          <stop offset="0%" stopColor={highlight} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>

        <linearGradient
          id={`side-${type}`}
          x1="20"
          y1="8"
          x2="34"
          y2="34"
        >
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>

      {type === "home" && (
        <>
          <path
            d="M6 18L20 6L34 18V33H6V18Z"
            fill={dark}
            opacity=".3"
          />
          <path
            d="M5 18L20 5L35 18"
            stroke={dark}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 17L20 8L31 17V32H9V17Z"
            fill={`url(#front-${type})`}
          />
          <path
            d="M20 8L31 17V32H20V8Z"
            fill={`url(#side-${type})`}
          />
          <path
            d="M15 32V23C15 20 17 19 20 19C23 19 25 20 25 23V32"
            fill="#35765D"
          />
          <rect
            x="11"
            y="20"
            width="5"
            height="5"
            rx="1"
            fill="#FFF7EC"
          />
          <rect
            x="24"
            y="20"
            width="5"
            height="5"
            rx="1"
            fill="#FFF7EC"
          />
        </>
      )}

      {type === "stories" && (
        <>
          <path
            d="M5 10C11 7 16 9 20 12V33C15 29 10 28 5 30V10Z"
            fill={dark}
            opacity=".4"
          />
          <path
            d="M20 12C25 8 30 8 35 10V30C29 28 24 29 20 33V12Z"
            fill={dark}
          />
          <path
            d="M5 8C11 5 16 7 20 10V30C15 26 10 25 5 27V8Z"
            fill={`url(#front-${type})`}
          />
          <path
            d="M20 10C25 6 30 6 35 8V27C29 25 24 26 20 30V10Z"
            fill={`url(#side-${type})`}
          />
          <path
            d="M9 13L16 14M9 18L16 19M9 23L16 24M24 13L31 12M24 18L31 17M24 23L31 22"
            stroke="#35765D"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity=".75"
          />
          <path
            d="M20 10V30"
            stroke={highlight}
            strokeWidth="1.5"
          />
        </>
      )}

      {type === "speak" && (
        <>
          <rect
            x="16"
            y="4"
            width="8"
            height="21"
            rx="4"
            fill={dark}
          />
          <rect
            x="14"
            y="3"
            width="8"
            height="21"
            rx="4"
            fill={`url(#front-${type})`}
          />
          <path
            d="M10 18V20C10 27 14 30 20 30C26 30 30 27 30 20V18"
            stroke={dark}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M10 17V19C10 25 14 28 20 28C26 28 30 25 30 19V17"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M20 29V34M14 34H26"
            stroke={highlight}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M17 8V14"
            stroke={highlight}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}

      {type === "notebook" && (
        <>
          <rect
            x="10"
            y="6"
            width="23"
            height="29"
            rx="3"
            fill={dark}
          />
          <rect
            x="8"
            y="5"
            width="23"
            height="29"
            rx="3"
            fill={`url(#front-${type})`}
          />
          <path
            d="M24 5H31V16L27.5 13.5L24 16V5Z"
            fill={color}
          />
          <path
            d="M13 20H25M13 24H26M13 28H22"
            stroke="#35765D"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M8 10H11M8 16H11M8 22H11M8 28H11"
            stroke={highlight}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-xl items-stretch">
        {NAV.map((item) => {
          const active = isActive(item.href, pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cx(
                "group flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 font-display text-[11px] font-bold transition-all duration-200",
                active
                  ? "nav-item-active"
                  : "nav-item hover:bg-white/5",
              )}
            >
              <NavIcon type={item.icon} active={active} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* --------------------------------------------------
   Page shell
-------------------------------------------------- */

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="paper-bg min-h-dvh">
      <main className="scale-text mx-auto max-w-xl px-4 pb-28 pt-6">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}

/* --------------------------------------------------
   Bottom sheet
-------------------------------------------------- */

export function Sheet({
  open,
  onClose,
  children,
  title,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  labelledBy?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 animate-fade bg-ink/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="scale-text relative max-h-[85dvh] w-full max-w-lg animate-rise overflow-y-auto rounded-t-3xl bg-paper p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto -mt-1 mb-3 h-1.5 w-10 rounded-full bg-ink/15" />

        {title && (
          <div className="mb-3 flex items-center justify-between gap-3">
            {title}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
