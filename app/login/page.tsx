import { Shield } from "lucide-react";
import { loginAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <Card className="w-full max-w-md border-white/10 bg-white/10 text-white shadow-2xl backdrop-blur">
        <CardHeader>
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/20 text-cyan-200">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle>Meta Permission Test Lab</CardTitle>
          <CardDescription className="text-slate-300">
            Internal-only control plane for Graph API permission validation and App Review evidence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-100">
                Admin Password
              </Label>
              <Input id="password" name="password" type="password" className="border-white/20 bg-white/5 text-white" />
            </div>
            {params.error ? <p className="text-sm text-rose-200">Password check failed. Try again.</p> : null}
            <Button className="w-full">Enter Lab</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
