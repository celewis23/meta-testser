export function SectionHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
