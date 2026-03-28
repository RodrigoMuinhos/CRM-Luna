"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/apiConfig";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type RequestStatus = "idle" | "loading" | "success" | "error";

const roles = [
  { value: "RECEPCAO", label: "Recepção" },
  { value: "ADMINISTRACAO", label: "Administração" },
];

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const parts: string[] = [];

  if (digits.length >= 3) {
    parts.push(digits.slice(0, 3));
  }
  if (digits.length >= 6) {
    parts.push(digits.slice(3, 6));
  }
  if (digits.length >= 9) {
    parts.push(digits.slice(6, 9));
  }

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export function RequestAccessForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [role, setRole] = useState(roles[0].value);
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          cpf: cpf.replace(/\D/g, ""),
          role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Solicitação enviada! Em breve entraremos em contato.");
      } else {
        setStatus("error");
        setError(data.error || "Não conseguimos registrar sua solicitação.");
      }
    } catch (err) {
      setStatus("error");
      setError("Erro ao contatar o servidor.");
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
                  Cadastre-se para trabalhar conosco e acompanhe consultas com precisão.
                </p>
              </div>
              <div className="opacity-60 text-sm">
                <p>Recepção e administração com perfil preparado.</p>
                <p>Escolha seu papel e esperaremos seu retorno.</p>
              </div>
            </div>
            <div className="px-10 py-12 flex-1">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#4A4A4A]">Solicitar acesso</p>
                <p className="text-sm text-[#6B6B6B]">
                  Envie seus dados e liberaremos o acesso conforme o perfil escolhido.
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
                  <Label htmlFor="requestName" className="text-sm text-[#6B6B6B]">
                    Nome completo
                  </Label>
                  <Input
                    id="requestName"
                    placeholder="Nome completo"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestEmail" className="text-sm text-[#6B6B6B]">
                    E-mail
                  </Label>
                  <Input
                    id="requestEmail"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestCpf" className="text-sm text-[#6B6B6B]">
                    CPF
                  </Label>
                  <Input
                    id="requestCpf"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(event) => setCpf(formatCpf(event.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestRole" className="text-sm text-[#6B6B6B]">
                    Perfil desejado
                  </Label>
                  <select
                    id="requestRole"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-[#D3A67F] focus:outline-none focus:ring-2 focus:ring-[#D3A67F]"
                    required
                  >
                    {roles.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#DD9063] hover:bg-[#c99970] text-white border border-transparent"
                  disabled={status === "loading" || status === "success"}
                >
                  {status === "loading" ? "Enviando..." : "Enviar solicitação"}
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
