'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Loader2, Pencil, AlertCircle } from 'lucide-react';
import { formatInAppTz } from '@/lib/app-timezone';

export const dynamic = 'force-dynamic';

type Role = 'admin' | 'checkin' | 'secretaria';

interface PlatformUser {
  uid: string;
  email: string;
  role: Role;
  enabled: boolean;
  created_at: string | null;
  hasChangedPassword: boolean;
  institution_id?: string | null;
  institution_name?: string | null;
}

interface InstitutionOption {
  id: string;
  name: string;
}

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const { role, user, getIdToken } = useAuth();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [editing, setEditing] = useState<PlatformUser | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<Role>('checkin');
  const [editInstitutionId, setEditInstitutionId] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetchWithAuth(getIdToken, '/api/admin/users');
      const data = await res.json();
      if (res.ok && data.users) setUsers(data.users);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (role === 'admin') loadUsers();
  }, [role, loadUsers]);

  useEffect(() => {
    if (role !== 'admin') return;
    let cancelled = false;
    fetchWithAuth(getIdToken, '/api/admin/institutions')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setInstitutions(
          list
            .map((i: { id?: string; name?: string }) => ({
              id: i.id ?? '',
              name: i.name ?? '',
            }))
            .filter((i: InstitutionOption) => i.id && i.name)
            .sort((a: InstitutionOption, b: InstitutionOption) =>
              a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
            )
        );
      })
      .catch(() => {
        if (!cancelled) setInstitutions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [role, getIdToken]);

  const roleLabel = (value: Role) => {
    if (value === 'admin') return t.admin.users.roleAdmin;
    if (value === 'secretaria') return t.admin.users.roleSecretaria;
    return t.admin.users.roleCheckin;
  };

  const openEdit = (target: PlatformUser) => {
    setEditing(target);
    setEditEmail(target.email === '—' ? '' : target.email);
    setEditRole(target.role);
    setEditInstitutionId(target.institution_id ?? '');
    setEditEnabled(target.enabled);
    setEditPassword('');
    setEditError(null);
    setEditSuccess(false);
  };

  const handleEditRoleChange = (value: Role) => {
    setEditRole(value);
    if (value !== 'secretaria') setEditInstitutionId('');
  };

  const mapUpdateError = (code: string | undefined) => {
    if (code === 'email_already_exists') return t.admin.users.emailAlreadyExists;
    if (code === 'password_too_short') return t.admin.users.passwordTooShort;
    if (code === 'password_too_weak') return t.admin.users.passwordTooWeak;
    if (code === 'institution_required' || code === 'institution_not_found') {
      return t.admin.users.institutionRequired;
    }
    if (code === 'cannot_change_own_role') return t.admin.users.cannotChangeOwnRole;
    if (code === 'cannot_disable_self') return t.admin.users.cannotDisableSelf;
    if (code === 'cannot_remove_last_admin') return t.admin.users.cannotRemoveLastAdmin;
    return t.admin.users.errorGeneric;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setEditError(null);
    setEditSuccess(false);
    const emailTrim = editEmail.trim();
    if (!emailTrim) {
      setEditError(t.admin.users.emailPlaceholder);
      return;
    }
    if (editPassword && editPassword.length < 8) {
      setEditError(t.admin.users.passwordTooShort);
      return;
    }
    if (editRole === 'secretaria' && !editInstitutionId) {
      setEditError(t.admin.users.institutionRequired);
      return;
    }
    setSaving(true);
    try {
      const res = await fetchWithAuth(getIdToken, `/api/admin/users/${editing.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailTrim,
          role: editRole,
          enabled: editEnabled,
          institution_id: editRole === 'secretaria' ? editInstitutionId : null,
          password: editPassword.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(mapUpdateError(data.error));
        return;
      }
      setEditSuccess(true);
      await loadUsers();
    } catch {
      setEditError(t.admin.users.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  if (role === 'checkin' || role === 'secretaria') {
    return null;
  }

  const isEditingSelf = Boolean(editing && user && editing.uid === user.uid);

  return (
    <AdminProtected>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="h-7 w-7" />
              {t.admin.users.title}
            </h1>
            <p className="text-muted-foreground mt-1">{t.admin.users.listDescription}</p>
          </div>
          <Link href="/admin/users/new">
            <Button className="gap-2 shrink-0">
              <UserPlus className="h-4 w-4" />
              {t.admin.users.addUser}
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin.users.listTitle}</CardTitle>
            <CardDescription>
              {t.admin.users.listDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="py-6 text-center space-y-4">
                <p className="text-muted-foreground">{t.admin.users.noUsers}</p>
                <Link href="/admin/users/new">
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    {t.admin.users.addUser}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.admin.users.email}</TableHead>
                      <TableHead>{t.admin.users.role}</TableHead>
                      <TableHead>{t.admin.users.institution}</TableHead>
                      <TableHead>{t.admin.users.status}</TableHead>
                      <TableHead>{t.admin.users.createdAt}</TableHead>
                      <TableHead className="w-[80px]">{t.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.uid}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>{roleLabel(u.role)}</TableCell>
                        <TableCell>
                          {u.role === 'secretaria' ? (u.institution_name || '—') : '—'}
                        </TableCell>
                        <TableCell>
                          {u.enabled ? t.common.active : t.common.inactive}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.created_at
                            ? formatInAppTz(u.created_at, 'dd/MM/yyyy HH:mm')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(u)}
                            aria-label={t.common.edit}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.admin.users.editUser}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t.admin.users.email}</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                disabled={saving}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">{t.admin.users.role}</Label>
              <Select
                value={editRole}
                onValueChange={(v) => handleEditRoleChange(v as Role)}
                disabled={saving || isEditingSelf}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t.admin.users.roleAdmin}</SelectItem>
                  <SelectItem value="checkin">{t.admin.users.roleCheckin}</SelectItem>
                  <SelectItem value="secretaria">{t.admin.users.roleSecretaria}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editRole === 'secretaria' && (
              <div className="space-y-2">
                <Label htmlFor="edit-institution">{t.admin.users.institution}</Label>
                <Select
                  value={editInstitutionId || undefined}
                  onValueChange={setEditInstitutionId}
                  disabled={saving}
                >
                  <SelectTrigger id="edit-institution">
                    <SelectValue placeholder={t.admin.users.institutionPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-status">{t.admin.users.status}</Label>
              <Select
                value={editEnabled ? 'active' : 'inactive'}
                onValueChange={(v) => setEditEnabled(v === 'active')}
                disabled={saving || isEditingSelf}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t.common.active}</SelectItem>
                  <SelectItem value="inactive">{t.common.inactive}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">{t.admin.users.newPassword}</Label>
              <Input
                id="edit-password"
                type="password"
                placeholder={t.admin.users.newPasswordPlaceholder}
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                disabled={saving}
                autoComplete="new-password"
              />
            </div>
            {isEditingSelf && (
              <p className="text-sm text-muted-foreground">{t.admin.users.cannotChangeOwnRole}</p>
            )}
            {editError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}
            {editSuccess && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <AlertDescription>{t.admin.users.updateSuccess}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminProtected>
  );
}
