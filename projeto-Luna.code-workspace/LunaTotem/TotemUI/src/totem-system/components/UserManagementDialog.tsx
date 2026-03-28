'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { userAPI, type UserAccount, type UserPayload } from '@/lib/api';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, Loader2, Pencil, Trash2, UserRoundPlus } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Role = 'RECEPCAO' | 'ADMINISTRACAO' | 'MEDICO';

type FormValues = {
  email: string;
  cpf: string;
  role: Role;
  password: string;
  confirmPassword: string;
};

type FieldErrors = Partial<Record<'email' | 'cpf', string>>;

const emptyForm: FormValues = {
  email: '',
  cpf: '',
  role: 'RECEPCAO',
  password: '',
  confirmPassword: '',
};

const roleOptions: Array<{ value: Role; label: string }> = [
  { value: 'ADMINISTRACAO', label: 'Administração' },
  { value: 'RECEPCAO', label: 'Recepção' },
  { value: 'MEDICO', label: 'Médico' },
];

const formatDate = (value?: string) => {
  if (!value) return 'Nunca atualizado';
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const normalizeCpf = (value?: string | null) => {
  return (value ?? '').replace(/\D/g, '').slice(0, 11);
};

const maskCpf = (value?: string | null) => {
  const digits = normalizeCpf(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const roleLabel = (role: Role) =>
  role === 'ADMINISTRACAO' ? 'Administração' : role === 'MEDICO' ? 'Médico' : 'Recepção';

const roleBadgeClass = (role: Role) => {
  switch (role) {
    case 'ADMINISTRACAO':
      return 'bg-amber-100 text-amber-800';
    case 'MEDICO':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-sky-100 text-sky-800';
  }
};

export function UserManagementDialog({ open, onOpenChange }: Props) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [formValues, setFormValues] = useState<FormValues>(emptyForm);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [showPasswordField, setShowPasswordField] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const startCreate = useCallback(() => {
    setEditingUser(null);
    setFormValues({ ...emptyForm });
    setFormError(null);
    setFieldErrors({});
    setShowPasswordField(true);
    setShowPassword(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const data = await userAPI.getAll();
        if (active) {
          setUsers(data);
          startCreate();
        }
      } catch (error) {
        console.error('Erro ao carregar usuários', error);
        toast.error('Não foi possível carregar os usuários.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadUsers();
    return () => {
      active = false;
    };
  }, [open, startCreate]);

  const handleEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFormValues({
      email: user.email,
      cpf: maskCpf(user.cpf),
      role: user.role,
      password: '',
      confirmPassword: '',
    });
    setShowPasswordField(false);
    setShowPassword(false);
    setFormError(null);
    setFieldErrors({});
  };

  const validate = () => {
    const errors: FieldErrors = {};
    const email = formValues.email.trim();
    if (!email) {
      errors.email = 'Informe um e-mail válido.';
    }
    const cpfDigits = normalizeCpf(formValues.cpf);
    if (cpfDigits.length !== 11) {
      errors.cpf = 'CPF deve ter 11 dígitos.';
    }
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setFormError('Corrija os campos destacados.');
      return null;
    }
    setFieldErrors({});
    setFormError(null);
    if (showPasswordField) {
      const password = formValues.password.trim();
      if (!password) {
        setFormError('Defina uma senha.');
        return null;
      }
      if (password !== formValues.confirmPassword.trim()) {
        setFormError('As senhas não conferem.');
        return null;
      }
    }
    setFormError(null);
    return { email, cpfDigits };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validated = validate();
    if (!validated) return;

    const payload: UserPayload = {
      email: validated.email,
      cpf: validated.cpfDigits,
      role: formValues.role,
    };
    if (showPasswordField && formValues.password.trim()) {
      payload.password = formValues.password.trim();
    }

    setIsSaving(true);
    try {
      let saved: UserAccount;
      if (editingUser) {
        saved = await userAPI.update(editingUser.id, payload);
        setUsers((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
        toast.success('Usuário atualizado.');
      } else {
        saved = await userAPI.create(payload);
        setUsers((prev) => [...prev, saved]);
        toast.success('Usuário criado.');
      }
      startCreate();
    } catch (error) {
      console.error('Erro ao salvar usuário', error);
      const status = (error as { status?: number })?.status;
      const rawMessage =
        error instanceof Error ? error.message.replace(/^API Error:\s*/i, '').trim() : '';
      if (status === 409) {
        const lower = rawMessage.toLowerCase();
        if (lower.includes('cpf')) {
          setFieldErrors((prev) => ({ ...prev, cpf: rawMessage || 'CPF já cadastrado.' }));
          setFormError(null);
          return;
        }
        if (lower.includes('email') || lower.includes('e-mail')) {
          setFieldErrors((prev) => ({ ...prev, email: rawMessage || 'E-mail já cadastrado.' }));
          setFormError(null);
          return;
        }
      }
      setFormError(rawMessage || 'Falha ao salvar usuário.');
      toast.error(rawMessage || 'Falha ao salvar usuário.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: UserAccount) => {
    const confirmed = window.confirm(`Excluir ${user.email}? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;
    try {
      await userAPI.delete(user.id);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      if (editingUser?.id === user.id) {
        startCreate();
      }
      toast.success('Usuário removido.');
    } catch (error) {
      console.error('Erro ao excluir usuário', error);
      toast.error('Não foi possível excluir o usuário.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl space-y-6 rounded-[28px] border border-gray-100 bg-white text-[#2F2F2F] px-5 py-6 sm:px-8 sm:py-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Usuários & Permissões</DialogTitle>
          <DialogDescription>
            Cadastre, atualize ou remova acessos do painel. Apenas administradores visualizam este controle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-base font-semibold text-gray-800">
                  {editingUser ? 'Editar usuário' : 'Nova conta'}
                </div>
                <p className="text-xs text-gray-500">
                  {editingUser
                    ? 'Atualize permissões ou gere uma nova senha temporária.'
                    : 'Cadastre e habilite o acesso dos times.'}
                </p>
              </div>
              {editingUser && (
                <button
                  type="button"
                  onClick={startCreate}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="user-email">E-mail profissional</Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="nome@empresa.com"
                  value={formValues.email}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
                {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-cpf">CPF</Label>
                <Input
                  id="user-cpf"
                  placeholder="000.000.000-00"
                  value={formValues.cpf}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, cpf: maskCpf(event.target.value) }))}
                />
                {fieldErrors.cpf && <p className="text-xs text-red-600">{fieldErrors.cpf}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-role">Perfil</Label>
                <select
                  id="user-role"
                  value={formValues.role}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, role: event.target.value as Role }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#D3A67F] focus:outline-none focus:ring-2 focus:ring-[#D3A67F]/40"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="user-password" className="inline-flex items-center gap-1 text-sm font-medium">
                    <KeyRound size={14} />
                    {editingUser ? 'Nova senha (opcional)' : 'Senha inicial'}
                  </Label>
                  {editingUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordField((prev) => {
                          const next = !prev;
                          if (!next) {
                            setFormValues((prevValues) => ({
                              ...prevValues,
                              password: '',
                              confirmPassword: '',
                            }));
                          }
                          return next;
                        });
                      }}
                      className="text-xs font-semibold text-[#D3A67F] hover:text-[#c99970]"
                    >
                      {showPasswordField ? 'Cancelar nova senha' : 'Definir nova senha'}
                    </button>
                  )}
                </div>

                {showPasswordField ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="relative">
                      <Input
                        id="user-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Senha segura"
                        value={formValues.password}
                        onChange={(event) => setFormValues((prev) => ({ ...prev, password: event.target.value }))}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#D3A67F]"
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="user-password-confirm"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirmar senha"
                        value={formValues.confirmPassword}
                        onChange={(event) =>
                          setFormValues((prev) => ({ ...prev, confirmPassword: event.target.value }))
                        }
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#D3A67F]"
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  editingUser && (
                    <p className="text-xs text-gray-500">A senha atual permanece até que você defina uma nova.</p>
                  )
                )}
                <p className="text-xs text-gray-500">
                  Recuperação de senha é feita automaticamente via e-mail cadastrado.
                </p>
              </div>
            </div>

            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-lg bg-[#D3A67F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c99970] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? 'Salvando...' : editingUser ? 'Atualizar usuário' : 'Criar usuário'}
            </button>
          </form>

          <section className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">Contas ativas</div>
                <p className="text-xs text-gray-500">Gerencie recepção, administração e médicos.</p>
              </div>
              <button
                type="button"
                onClick={startCreate}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D3A67F]/40 text-[#D3A67F] hover:bg-[#F6EFE7]"
                aria-label="Criar nova conta"
              >
                <span className="text-xl leading-none">+</span>
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando usuários...
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                Nenhum usuário cadastrado ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{user.email}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${roleBadgeClass(user.role)}`}>
                          {roleLabel(user.role)}
                        </span>
                        <span>CPF {maskCpf(user.cpf)}</span>
                        <span>Atualizado {formatDate(user.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(user)}
                        className="rounded-md border border-gray-200 p-2 text-gray-600 hover:text-[#D3A67F]"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        className="rounded-md border border-gray-200 p-2 text-gray-600 hover:text-red-600"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
