'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPlus, Loader2 } from 'lucide-react';
import { formatInAppTz } from '@/lib/app-timezone';

export const dynamic = 'force-dynamic';

type Role = 'admin' | 'checkin';

interface PlatformUser {
  uid: string;
  email: string;
  role: Role;
  enabled: boolean;
  created_at: string | null;
  hasChangedPassword: boolean;
}

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const { role, getIdToken } = useAuth();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

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

  if (role === 'checkin') {
    return null;
  }

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
                      <TableHead>{t.admin.users.status}</TableHead>
                      <TableHead>{t.admin.users.createdAt}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.uid}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          {u.role === 'admin' ? t.admin.users.roleAdmin : t.admin.users.roleCheckin}
                        </TableCell>
                        <TableCell>
                          {u.enabled ? t.common.active : t.common.inactive}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.created_at
                            ? formatInAppTz(u.created_at, 'dd/MM/yyyy HH:mm')
                            : '—'}
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
    </AdminProtected>
  );
}
