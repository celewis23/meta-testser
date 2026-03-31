import { stringify } from "csv-stringify/sync";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const environmentId = request.nextUrl.searchParams.get("environmentId");
  const format = request.nextUrl.searchParams.get("format") ?? "json";

  if (!environmentId) {
    return NextResponse.json({ error: "environmentId is required" }, { status: 400 });
  }

  const items = await prisma.testRunItem.findMany({
    where: {
      status: "PASSED",
      testRun: { environmentId },
      testDefinition: { appearsInReviewPack: true }
    },
    include: {
      testDefinition: true,
      testRun: true
    },
    orderBy: { createdAt: "desc" }
  });

  const rows = items.map((item) => ({
    permission: ((item.testDefinition.requiredPermissions as string[]) ?? []).join(", "),
    test: item.testDefinition.displayName,
    lastSuccessfulRun: item.createdAt.toISOString(),
    endpoint: item.endpoint,
    relevantIds: JSON.stringify(item.relevantIds ?? {}),
    summary: item.testDefinition.description
  }));

  if (format === "csv") {
    return new NextResponse(stringify(rows, { header: true }), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="review-pack-${environmentId}.csv"`
      }
    });
  }

  if (format === "print") {
    const html = `
      <html>
        <head><title>App Review Pack</title><style>body{font-family:Arial;padding:32px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;text-align:left}</style></head>
        <body>
          <h1>Meta Permission Test Lab - App Review Pack</h1>
          <table>
            <thead><tr><th>Permission</th><th>Test</th><th>Last Successful Run</th><th>Endpoint</th><th>Relevant IDs</th><th>Summary</th></tr></thead>
            <tbody>
              ${rows
                .map(
                  (row) =>
                    `<tr><td>${row.permission}</td><td>${row.test}</td><td>${row.lastSuccessfulRun}</td><td>${row.endpoint}</td><td>${row.relevantIds}</td><td>${row.summary}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  }

  return NextResponse.json(rows);
}
