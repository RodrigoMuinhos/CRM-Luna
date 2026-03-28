'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, PauseCircle, Pencil, Trash2 } from 'lucide-react';

type Papel =
  | 'RESP_GERAL'
  | 'TECH_LEAD'
  | 'DEVOPS_SRE'
  | 'DBA'
  | 'DPO_LGPD'
  | 'JURIDICO'
  | 'COMERCIAL'
  | 'SUPORTE_N1'
  | 'SUPORTE_N2';

type Responsavel = {
  id: number;
  nome: string;
  cargo: string;
  papel: Papel;
  email: string;
  telefone?: string;
  observacoes?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
};

const PAPEL_OPTIONS: Array<{ value: Papel; label: string }> = [
  { value: 'RESP_GERAL', label: 'Responsável Geral' },
  { value: 'TECH_LEAD', label: 'Tech Lead' },
  { value: 'DEVOPS_SRE', label: 'DevOps / SRE' },
  { value: 'DBA', label: 'DBA' },
  { value: 'DPO_LGPD', label: 'DPO / LGPD' },
  { value: 'JURIDICO', label: 'Jurídico' },
  { value: 'COMERCIAL', label: 'Comercial' },
  { value: 'SUPORTE_N1', label: 'Suporte N1' },
  { value: 'SUPORTE_N2', label: 'Suporte N2' },
];

const EMPTY_FORM = {
  nome: '',
  cargo: '',
  papel: 'RESP_GERAL' as Papel,
  email: '',
  telefone: '',
  observacoes: '',
};

export function ResponsaveisPanel() {
  const [items, setItems] = useState<Responsavel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/responsaveis', { cache: 'no-store' });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Falha ao carregar responsáveis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const papelLabel = useMemo(() => {
    const map = new Map(PAPEL_OPTIONS.map((o) => [o.value, o.label]));
    return (p: Papel) => map.get(p) || p;
  }, []);

  const createResponsavel = async () => {
    if (!form.nome.trim() || !form.cargo.trim() || !form.email.trim()) {
      toast.error('Preencha nome, cargo e e-mail.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/responsaveis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Erro ao criar responsável.');
        return;
      }

      toast.success('Responsável adicionado.');
      setForm(EMPTY_FORM);
      await loadItems();
    } catch {
      toast.error('Falha ao salvar responsável.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (item: Responsavel) => {
    try {
      const res = await fetch(`/api/responsaveis/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !item.ativo }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Erro ao atualizar status.');
        return;
      }
      toast.success('Status atualizado.');
      await loadItems();
    } catch {
      toast.error('Falha ao atualizar status.');
    }
  };

  const removeItem = async (id: number) => {
    try {
      const res = await fetch(`/api/responsaveis/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Erro ao remover responsável.');
        return;
      }
      toast.success('Responsável removido.');
      await loadItems();
    } catch {
      toast.error('Falha ao remover responsável.');
    }
  };

  const startEdit = (item: Responsavel) => {
    setEditingId(item.id);
    setEditForm({
      nome: item.nome,
      cargo: item.cargo,
      papel: item.papel,
      email: item.email,
      telefone: item.telefone || '',
      observacoes: item.observacoes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  };

  const saveEdit = async (id: number) => {
    if (!editForm.nome.trim() || !editForm.cargo.trim() || !editForm.email.trim()) {
      toast.error('Preencha nome, cargo e e-mail para salvar.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/responsaveis/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Erro ao salvar edição.');
        return;
      }

      toast.success('Responsável atualizado.');
      setEditingId(null);
      setEditForm(EMPTY_FORM);
      await loadItems();
    } catch {
      toast.error('Falha ao salvar edição.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E8E2DA] bg-white p-5">
        <h3 className="text-lg font-semibold text-[#4A4A4A]">Quem é quem (responsáveis)</h3>
        <p className="text-sm text-[#7B6A5A]">Cadastro simples para definir papéis de operação, técnico e negócio.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="rounded-xl border border-[#D3A67F]/30 px-3 py-2" placeholder="Nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          <input className="rounded-xl border border-[#D3A67F]/30 px-3 py-2" placeholder="Cargo" value={form.cargo} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} />
          <select className="rounded-xl border border-[#D3A67F]/30 px-3 py-2" value={form.papel} onChange={(e) => setForm((f) => ({ ...f, papel: e.target.value as Papel }))}>
            {PAPEL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <input className="rounded-xl border border-[#D3A67F]/30 px-3 py-2" placeholder="E-mail" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <input className="rounded-xl border border-[#D3A67F]/30 px-3 py-2" placeholder="Telefone (opcional)" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
          <input className="rounded-xl border border-[#D3A67F]/30 px-3 py-2" placeholder="Observações (opcional)" value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={createResponsavel}
            disabled={saving}
            className="rounded-xl bg-[#8C7155] px-4 py-2 text-sm font-medium text-white hover:bg-[#7C6248] disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Adicionar responsável'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E8E2DA] bg-white p-5">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#8C7155]">Lista de responsáveis</h4>

        {loading ? (
          <p className="text-sm text-[#7B6A5A]">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[#7B6A5A]">Nenhum responsável cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#EFE7DC] bg-[#FCFAF7] p-3">
                {editingId === item.id ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 md:grid-cols-2">
                      <input className="rounded-lg border border-[#D3A67F]/30 px-3 py-2 text-sm" value={editForm.nome} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} />
                      <input className="rounded-lg border border-[#D3A67F]/30 px-3 py-2 text-sm" value={editForm.cargo} onChange={(e) => setEditForm((f) => ({ ...f, cargo: e.target.value }))} />
                      <select className="rounded-lg border border-[#D3A67F]/30 px-3 py-2 text-sm" value={editForm.papel} onChange={(e) => setEditForm((f) => ({ ...f, papel: e.target.value as Papel }))}>
                        {PAPEL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <input className="rounded-lg border border-[#D3A67F]/30 px-3 py-2 text-sm" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                      <input className="rounded-lg border border-[#D3A67F]/30 px-3 py-2 text-sm" value={editForm.telefone} onChange={(e) => setEditForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="Telefone" />
                      <input className="rounded-lg border border-[#D3A67F]/30 px-3 py-2 text-sm" value={editForm.observacoes} onChange={(e) => setEditForm((f) => ({ ...f, observacoes: e.target.value }))} placeholder="Observações" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => saveEdit(item.id)} disabled={saving} className="rounded-lg bg-[#8C7155] px-3 py-1 text-xs font-semibold text-white hover:bg-[#7C6248] disabled:opacity-60">Salvar</button>
                      <button type="button" onClick={cancelEdit} className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#4A4A4A]">{item.nome}</p>
                        <p className="text-xs text-[#7B6A5A]">{item.cargo} · {papelLabel(item.papel)}</p>
                        <p className="text-xs text-[#7B6A5A]">{item.email}{item.telefone ? ` · ${item.telefone}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleAtivo(item)}
                          title={item.ativo ? 'Marcar como inativo' : 'Marcar como ativo'}
                          aria-label={item.ativo ? 'Marcar como inativo' : 'Marcar como ativo'}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                            item.ativo
                              ? 'border-[#BFE8D0] bg-[#EAF9F0] text-[#1F8A53]'
                              : 'border-[#E8E2DA] bg-[#F9F6F2] text-[#8C7155]'
                          }`}
                        >
                          {item.ativo ? <CheckCircle2 size={15} /> : <PauseCircle size={15} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          title="Editar responsável"
                          aria-label="Editar responsável"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E2DA] bg-[#F9F6F2] text-[#8C7155] transition hover:bg-[#F2E7DD]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          title="Remover responsável"
                          aria-label="Remover responsável"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#F3D5D5] bg-[#FFF3F3] text-[#D64545] transition hover:bg-[#FFE8E8]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {!!item.observacoes && (
                      <p className="mt-2 text-xs text-[#6B5C4A]">Obs.: {item.observacoes}</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
