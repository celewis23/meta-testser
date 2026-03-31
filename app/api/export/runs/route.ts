import { stringify } from "csv-stringify/sync";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  const format = request.nextUrl.searchParams.get("format") ?? "json";

  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  const run = await prisma.testRun.findUnique({
    where: { id: runId },
    include: {
      environment: true,
      items: {
        include: {
          testDefinition: true
        }
      }
    }
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (format === "csv") {
    const csv = stringify(
      run.items.map((item) => ({
        test: item.testDefinition.displayName,
        status: item.status,
        endpoint: item.endpoint,
        tokenType: item.tokenType,
        responseCode: item.responseCode,
        executionTimeMs: item.executionTimeMs,
        createdAt: item.createdAt.toISOString()
      })),
      { header: true }
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="run-${runId}.csv"`
      }
    });
  }

  return NextResponse.json(run);
}
