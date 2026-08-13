'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Role = 'admin' | 'checkin';

export default function AdminUsersNewPage() {
  const { t } = useLanguage();
  const { role, getIdToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleValue, setRoleValue] = useState<Role>('checkin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const emailTrim = email.trim();
    const passwordTrim = password.trim();
    if (!emailTrim) {
      setError(t.admin.users.emailPlaceholder);
      return;
    }
    if (passwordTrim.length < 8) {
      setError(t.admin.users.passwordTooShort);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithAuth(getIdToken, '/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrim, password: passwordTrim, role: roleValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'email_already_exists') setError(t.admin.users.emailAlreadyExists);
        else if (data.error === 'password_too_short') setError(t.admin.users.passwordTooShort);
        else if (data.error === 'password_too_weak') setError(t.admin.users.passwordTooWeak);
        else setError(t.admin.users.errorGeneric);
        return;
      }
      setSuccess(true);
      setEmail('');
      setPassword('');
    } catch {
      setError(t.admin.users.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  if (role === 'checkin') {
    return null;
  }

  return (
    <AdminProtected>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="h-7 w-7" />
              {t.admin.users.createUser}
            </h1>
            <p className="text-muted-foreground mt-1">{t.admin.users.createUserDescription}</p>
          </div>
        </div>

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t.admin.users.createUser}</CardTitle>
            <CardDescription>
              {t.admin.users.createUserDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-email">{t.admin.users.email}</Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder={t.admin.users.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">{t.admin.users.password}</Label>
                <Input
                  id="user-password"
                  type="password"
                  placeholder={t.admin.users.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-role">{t.admin.users.role}</Label>
                <Select
                  value={roleValue}
                  onValueChange={(v) => setRoleValue(v as Role)}
                  disabled={loading}
                >
                  <SelectTrigger id="user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t.admin.users.roleAdmin}</SelectItem>
                    <SelectItem value="checkin">{t.admin.users.roleCheckin}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <AlertDescription>{t.admin.users.success}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t.admin.users.submit}
                </Button>
                <Link href="/admin/users">
                  <Button type="button" variant="outline">
                    {t.admin.users.backToList}
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminProtected>
  );
}
