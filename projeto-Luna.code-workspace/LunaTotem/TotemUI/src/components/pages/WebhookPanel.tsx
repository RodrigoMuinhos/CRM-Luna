'use client';

import { useState, useEffect } from 'react';
import { Button } from '../Button';
import { Webhook, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface WebhookConfig {
  id?: number;
  webhookUrl: string;
  authToken?: string;
  authHeaderName?: string;
  enabled: boolean;
  tenantId: string;
  timeoutSeconds: number;
}

export function WebhookPanel() {
  const [config, setConfig] = useState<WebhookConfig>({
    webhookUrl: '',
    authToken: '',
    authHeaderName: 'Authorization',
    enabled: true,
    tenantId: 'default',
    timeoutSeconds: 10,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
      const response = await fetch(`${apiUrl}/api/webhook-config?tenantId=default`);
      
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
      const response = await fetch(`${apiUrl}/api/webhook-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setMessage({ type: 'success', text: 'Configuração salva com sucesso!' });
      } else {
        setMessage({ type: 'error', text: 'Erro ao salvar configuração' });
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configuração' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
      const response = await fetch(`${apiUrl}/api/webhook-config/test?tenantId=default`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Webhook enviado com sucesso! Verifique o sistema de destino.' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Falha ao enviar webhook' });
      }
    } catch (error) {
      console.error('Erro ao testar:', error);
      setMessage({ type: 'error', text: 'Erro ao testar webhook. Verifique a URL.' });
    } finally {
      setTesting(false);
    }
  };

  const inputClass =
    'w-full rounded-2xl border-2 border-[#D3A67F]/30 bg-[#F9F6F2] px-4 py-3 text-[#4A4A4A] placeholder-[#7B6A5A]/50 focus:border-[#D3A67F] focus:outline-none';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-[#7B6A5A]">Carregando configuração...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-[#F2E7DD] p-3">
            <Webhook className="h-6 w-6 text-[#8C7155]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#4A4A4A]">Webhook de Check-in</h2>
            <p className="text-sm text-[#7B6A5A]">
              Configure para onde enviar notificações quando um paciente concluir o check-in
            </p>
          </div>
        </div>

        {/* Mensagens */}
        {message && (
          <div
            className={`mb-4 rounded-2xl p-4 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : message.type === 'error'
                ? 'bg-red-50 text-red-800'
                : 'bg-blue-50 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' && <CheckCircle className="h-5 w-5" />}
              {message.type === 'error' && <XCircle className="h-5 w-5" />}
              {message.type === 'info' && <AlertCircle className="h-5 w-5" />}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* URL do Webhook */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#4A4A4A]">
            URL do Webhook <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={config.webhookUrl}
            onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
            placeholder="https://seu-sistema.com/api/checkin"
            className={inputClass}
            required
          />
          <p className="text-xs text-[#7B6A5A]">
            URL completa para onde os dados de check-in serão enviados via POST
          </p>
        </div>

        {/* Token de Autenticação */}
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-[#4A4A4A]">
            Token de Autenticação (opcional)
          </label>
          <input
            type="password"
            value={config.authToken || ''}
            onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
            placeholder="seu-token-secreto"
            className={inputClass}
          />
          <p className="text-xs text-[#7B6A5A]">
            Se seu sistema requer autenticação, informe o token aqui
          </p>
        </div>

        {/* Nome do Header */}
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-[#4A4A4A]">
            Nome do Header (opcional)
          </label>
          <input
            type="text"
            value={config.authHeaderName || 'Authorization'}
            onChange={(e) => setConfig({ ...config, authHeaderName: e.target.value })}
            placeholder="Authorization"
            className={inputClass}
          />
          <p className="text-xs text-[#7B6A5A]">
            Padrão: &quot;Authorization&quot; (Bearer token). Altere se seu sistema usar outro header
          </p>
        </div>

        {/* Timeout */}
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-[#4A4A4A]">Timeout (segundos)</label>
          <input
            type="number"
            min="1"
            max="60"
            value={config.timeoutSeconds}
            onChange={(e) => setConfig({ ...config, timeoutSeconds: parseInt(e.target.value) || 10 })}
            className={inputClass + ' w-32'}
          />
        </div>

        {/* Habilitado */}
        <div className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            id="webhook-enabled"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="h-5 w-5 rounded border-[#D3A67F]/30 text-[#8C7155] focus:ring-[#D3A67F]"
          />
          <label htmlFor="webhook-enabled" className="text-sm font-medium text-[#4A4A4A]">
            Webhook ativado
          </label>
        </div>

        {/* Botões */}
        <div className="mt-6 flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || !config.webhookUrl}
            className="flex-1 rounded-2xl bg-[#8C7155] px-6 py-3 text-white hover:bg-[#7C6248]"
          >
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>

          <Button
            onClick={handleTest}
            disabled={testing || !config.webhookUrl}
            className="rounded-2xl border-2 border-[#8C7155] bg-white px-6 py-3 text-[#8C7155] hover:bg-[#F9F6F2]"
          >
            {testing ? 'Testando...' : 'Testar'}
          </Button>
        </div>
      </div>

      {/* Informações sobre o payload */}
      <div className="rounded-2xl bg-blue-50 p-6">
        <h3 className="mb-3 font-semibold text-blue-900">📤 Dados enviados no check-in</h3>
        <div className="space-y-1 text-sm text-blue-800">
          <p>• Nome do Paciente</p>
          <p>• CPF do Paciente</p>
          <p>• Nome do Médico</p>
          <p>• Especialidade</p>
          <p>• Horário Agendado</p>
          <p>• Horário de Conclusão do Check-in</p>
          <p>• Data e Hora do Agendamento</p>
          <p>• Status da Consulta</p>
        </div>
      </div>
    </div>
  );
}
