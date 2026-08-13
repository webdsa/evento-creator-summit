'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { isStrongPassword } from '@/lib/password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, Lock, ShieldAlert } from 'lucide-react';

const MIN_PASSWORD_LENGTH = 8;

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { changePassword, mustChangePassword, getIdToken, refreshAdminStatus } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword.length < MIN_PASSWORD_LENGTH || !isStrongPassword(newPassword)) {
      setError(t.admin.settings.weakPassword);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.admin.settings.mismatch);
      return;
    }

    setIsLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    if (result.error) {
      setIsLoading(false);
      if (result.error === 'auth/wrong-password' || result.error === 'auth/invalid-credential') {
        setError(t.admin.settings.wrongPassword);
      } else if (result.error === 'auth/weak-password') {
        setError(t.admin.settings.weakPassword);
      } else {
        setError(result.error);
      }
      return;
    }

    try {
      const syncRes = await fetchWithAuth(getIdToken, '/api/admin/password-changed', {
        method: 'POST',
      });
      if (!syncRes.ok) {
        await refreshAdminStatus();
        setError(t.admin.settings.passwordSyncFailed);
        return;
      }
      const profile = await refreshAdminStatus();
      if (profile && !profile.mustChangePassword) {
        router.replace(profile.role === 'checkin' ? '/admin/checkin' : '/admin');
        return;
      }
      if (profile?.mustChangePassword) {
        setSuccess(true);
        return;
      }
      setError(t.admin.settings.passwordSyncFailed);
    } catch {
      await refreshAdminStatus();
      setError(t.admin.settings.passwordSyncFailed);
    } finally {
      setIsLoading(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <AdminProtected>
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold mb-6">{t.admin.settings.title}</h1>

        {mustChangePassword && (
          <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-900">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              <strong>{t.admin.settings.mustChangePasswordRequired}</strong>{' '}
              {t.admin.settings.changePasswordRequiredDescription}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t.admin.settings.changePassword}
            </CardTitle>
            <CardDescription>
              {mustChangePassword
                ? t.admin.settings.changePasswordRequiredDescription
                : t.admin.settings.changePasswordDescription}{' '}
              {t.admin.settings.passwordRules}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{t.admin.settings.success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t.admin.settings.currentPassword}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t.admin.settings.newPassword}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t.admin.settings.confirmPassword}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="h-11"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.admin.settings.submit}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminProtected>
  );
}
