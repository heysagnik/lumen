import type { DocumentStatus } from "@lumen/shared";

export function DocumentProgress({ status }: { status: DocumentStatus }) {
  if (status.status !== "processing") return null;

  const readingPages = status.pages_processed < status.pages_total;
  const percent = status.pages_total > 0 ? Math.round((status.pages_processed / status.pages_total) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5 shrink-0">
      <div className="h-1 rounded-full bg-foreground/10 overflow-hidden">
        {readingPages ? (
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-accent animate-[progress-sweep_1.4s_ease-in-out_infinite]" />
        )}
      </div>
      <span className="text-subtle tabular-nums text-xs">
        {readingPages ? `Reading pages ${status.pages_processed}/${status.pages_total}` : "Extracting facts…"}
      </span>
    </div>
  );
}
