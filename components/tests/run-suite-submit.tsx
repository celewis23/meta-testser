"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function RunSuiteSubmit() {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-3">
      <Button type="submit" disabled={pending} className="min-w-36">
        {pending ? (
          <>
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Running suite...
          </>
        ) : (
          "Run suite"
        )}
      </Button>
      {pending ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          The lab is resolving IDs, validating dependencies, and calling the Graph API server-side. This can take a little while for multi-test suites.
        </div>
      ) : null}
    </div>
  );
}
