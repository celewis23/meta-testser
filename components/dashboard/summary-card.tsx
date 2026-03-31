import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SummaryCard({
  title,
  value,
  description
}: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
