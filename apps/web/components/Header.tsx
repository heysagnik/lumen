import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const GITHUB_URL = "https://github.com/heysagnik/lumen";

function GithubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.2c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.5 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.74 0 0 .84-.27 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.43.2 2.48.1 2.74.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .28.18.61.69.5A10.02 10.02 0 0 0 22 12.2C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-5">
      <Link href="/" className="flex shrink-0 items-center gap-2">
        <Logo size={22} />
        <span className="text-[15px] font-semibold tracking-tight">Lumen</span>
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted ring-1 ring-inset ring-border-strong transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground sm:px-3"
        >
          <GithubIcon />
          <span className="hidden sm:inline">GitHub</span>
        </a>
        <Link
          href="/getting-started"
          className="btn-3d group relative inline-flex h-8 shrink-0 select-none items-center rounded-lg bg-accent px-2.5 text-[13px] font-medium whitespace-nowrap text-accent-foreground shadow-[0_1px_2px_oklch(0_0_0/0.12),0_4px_10px_oklch(0_0_0/0.14)] transition-transform duration-150 active:scale-[0.96] sm:px-3"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] transition-opacity duration-150 group-hover:opacity-80"
          />
          <span className="relative">
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Getting Started</span>
          </span>
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}
