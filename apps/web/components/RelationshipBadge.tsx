import type { FactRelationship } from "@lumen/shared";

const TEXT_STYLE: Record<FactRelationship["relationType"], string> = {
  corroborates: "text-success",
  contradicts: "text-danger",
  reconciled: "text-warning",
  unrelated: "text-subtle",
};

const DOT_STYLE: Record<FactRelationship["relationType"], string> = {
  corroborates: "bg-success",
  contradicts: "bg-danger",
  reconciled: "bg-warning",
  unrelated: "bg-subtle",
};

export function RelationshipBadge({ type }: { type: FactRelationship["relationType"] }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${TEXT_STYLE[type]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_STYLE[type]}`} />
      {type}
    </span>
  );
}
