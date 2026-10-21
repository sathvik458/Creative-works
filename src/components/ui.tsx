"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { EndingType, Level } from "@/content/schema";
import { ENDING_TYPE_META } from "@/lib/config";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

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

/** Row of dots: filled = discovered ending. */
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
  if (href)
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {children}
      </Link>
    );
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

const NAV = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/stories", label: "Stories", icon: "stories" },
  { href: "/speak", label: "Speak", icon: "speak" },
  { href: "/notebook", label: "Notebook", icon: "notebook" },
];
function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href === "/stories")
    return (
      pathname.startsWith("/stories") ||
      pathname.startsWith("/story") ||
      pathname.startsWith("/play")
    );
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-xl">
        {NAV.map((n) => {
          const active = isActive(n.href, pathname);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-label={n.label}
              className={cx(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 font-display text-[11px] font-bold transition",
                active ? "nav-item-active" : "nav-item",
              )}
            >
              <span
                className={cx(
                  "text-xl transition",
                  active ? "scale-110" : "opacity-85",
                )}
              >
                <img
                  src={`/images/nav/${n.icon}.svg`}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9"
                />
              </span>
              {n.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

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
