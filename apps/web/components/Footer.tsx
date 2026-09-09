import Link from "next/link";

export function Footer() {
  return (
    <footer className="shrink-0 pt-4 text-center text-xs text-subtle flex items-center justify-center gap-2.5">
      <span>
        Built by <span className="text-muted font-medium">Sagnik</span>
      </span>
      <span>·</span>
      <Link href="/getting-started" className="hover:text-foreground transition-colors">
        Getting Started
      </Link>
    </footer>
  );
}

