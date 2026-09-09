import type { DocumentStatus } from "@lumen/shared";

const STATUS_LABEL: Record<DocumentStatus["status"], string> = {
  processing: "Processing",
  done: "Done",
  error: "Error",
};

const STATUS_TEXT: Record<DocumentStatus["status"], string> = {
  processing: "text-accent",
  done: "text-success",
  error: "text-danger",
};

const STATUS_DOT: Record<DocumentStatus["status"], string> = {
  processing: "bg-accent",
  done: "bg-success",
  error: "bg-danger",
};

export function StatusIndicator({ status }: { status: DocumentStatus["status"] }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium shrink-0 ${STATUS_TEXT[status]}`}>
      {status === "processing" ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
        </span>
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}
