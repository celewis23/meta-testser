export function JsonInspector({
  title = "Raw JSON",
  value
}: {
  title?: string;
  value: unknown;
}) {
  return (
    <details className="rounded-xl border border-border bg-muted/40 p-4">
      <summary className="cursor-pointer text-sm font-medium">{title}</summary>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}
