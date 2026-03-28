"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/apiConfig";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function ForgotPasswordRequest() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    setError("");
    setMessage("");

    const frontendUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, frontendUrl }),
      });
      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Enviamos um link para redefinir sua senha.");
      } else {
        setStatus("error");
        setError(data.error || "Não foi possível solicitar a redefinição.");
      }
    } catch (err) {
      setStatus("error");
      setError("Falha ao conectar com o servidor.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F6F1] px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="rounded-[28px] bg-white shadow-[0_35px_90px_rgba(28,23,18,0.35)] overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="bg-gradient-to-b from-[#DD9063] to-[#CFA076] px-10 py-12 text-white flex flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.6em]">LUNA VITA</p>
                <h1 className="font-serif text-4xl leading-tight mt-4">WORK<br />SPACE</h1>
                <p className="mt-3 text-sm text-white/90 max-w-sm">
                  Acesse sua área de trabalho e tenha uma ótima jornada.
                </p>
              </div>
              <div className="opacity-60 text-sm">
                <p>Recupere acesso em instantes.</p>
                <p>Use o link enviado ao seu e-mail.</p>
              </div>
            </div>
            <div className="px-10 py-12 flex-1">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#4A4A4A]">Esqueceu sua senha?</p>
                <p className="text-sm text-[#6B6B6B]">
                  Informe seu e-mail e enviaremos um link para criar uma nova senha.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5 mt-6">
                {status === "success" && (
                  <Alert className="border-green-500 text-green-700 bg-green-50">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                )}
                {status === "error" && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="forgotEmail" className="text-sm text-[#6B6B6B]">
                    E-mail
                  </Label>
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#DD9063] hover:bg-[#c99970] text-white border border-transparent"
                  disabled={status === "loading" || status === "success"}
                >
                  {status === "loading" ? "Enviando..." : "Receber link por e-mail"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-[#6B6B6B]"
                  onClick={() => router.push("/")}
                >
                  Voltar ao Totem
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
