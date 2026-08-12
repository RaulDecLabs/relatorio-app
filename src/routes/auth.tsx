import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — InsightOS" },
      { name: "description", content: "Acesse sua conta InsightOS." },
    ],
  }),
  component: AuthPage,
});

const credsSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type Creds = z.infer<typeof credsSchema>;

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/reports", replace: true });
    });
  }, [navigate]);

  const form = useForm<Creds>({
    resolver: zodResolver(credsSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: Creds) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      navigate({ to: "/reports", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/reports",
      });
      if (result.error) throw result.error;
      if (!result.redirected) navigate({ to: "/reports", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no login Google");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-primary to-[oklch(0.45_0.18_265)] p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/15">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">InsightOS</span>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold leading-tight">
            O centro de gestão e performance da sua agência.
          </h2>
          <p className="max-w-md text-sm text-white/80">
            Consolide dados de Google Ads, Meta Ads, Search Console e GA4.
            Tenha em mãos leituras executivas precisas e planos de ação estratégicos para acelerar seus resultados.
          </p>
        </div>
        <div className="text-xs text-white/60">© {new Date().getFullYear()} InsightOS</div>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md border-border/70 shadow-sm">
          <CardContent className="p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold">Bem-vindo</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Entre com sua conta para acessar o painel.
              </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Aguarde..." : "Entrar"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              ou
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full" onClick={onGoogle} disabled={loading}>
              <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" fill="#34A853"/>
                <path d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.47 1.18 4.95l3.66-2.84Z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" fill="#EA4335"/>
              </svg>
              Continuar com Google
            </Button>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Não tem acesso? Solicite ao administrador da sua agência.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
