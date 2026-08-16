'use client';

import { useEffect, useState } from 'react';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface DashboardStats {
  totalRegistrations: number;
  activeInstitutions: number;
  activeVouchers: number;
  lowQuotaVouchers: Array<{
    code: string;
    remaining: number;
  }>;
  institutionUsage: Array<{
    name: string;
    used: number;
    total: number;
    remaining: number;
  }>;
}

const FALLBACK_DASHBOARD = {
  title: 'Dashboard',
  totalRegistrations: 'Total de Inscrições',
  activeInstitutions: 'Instituições Ativas',
  activeVouchers: 'Vouchers Ativos',
  alerts: 'Alertas',
  lowQuotaVouchers: 'Vouchers com Poucas Vagas',
  institutionUsage: 'Inscritos por União/Instituição',
  institutionName: 'Instituição',
  used: 'Usadas',
  total: 'Total',
  remaining: 'Restantes',
  noAlerts: 'Nenhum alerta no momento',
} as const;

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const { user, getIdToken, role } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const d = t?.admin?.dashboard ?? FALLBACK_DASHBOARD;

  useEffect(() => {
    if (!user || role === 'checkin' || role === 'secretaria') {
      if (user && (role === 'checkin' || role === 'secretaria')) {
        setLoading(false);
        setStatsError(false);
      }
      return;
    }
    loadStats();
  }, [user, role]);

  const loadStats = async () => {
    setStatsError(false);
    try {
      const res = await fetchWithAuth(getIdToken, '/api/admin/stats');
      if (!res.ok) {
        setStatsError(true);
        return;
      }
      const data = await res.json();

      const registrations: { status?: string }[] = data.registrations ?? [];
      const institutions: { name: string; quota_total: number; used_count: number; status: string }[] =
        data.institutions ?? [];
      const vouchers: { code: string; quota_total: number; used_count: number; status: string }[] =
        data.vouchers ?? [];

      const totalRegistrations = registrations.filter((r) => r.status === 'confirmed').length;
      const activeInstitutions = institutions.filter((i) => i.status === 'active');
      const activeVouchers = vouchers.filter((v) => v.status === 'active');

      const lowQuotaVouchers = activeVouchers
        .map((v) => ({
          code: v.code,
          remaining: v.quota_total - v.used_count,
        }))
        .filter((v) => v.remaining <= 2 && v.remaining > 0)
        .sort((a, b) => a.remaining - b.remaining);

      const institutionUsage = activeInstitutions.map((i) => ({
        name: i.name,
        used: i.used_count,
        total: i.quota_total,
        remaining: i.quota_total - i.used_count,
      }));

      setStats({
        totalRegistrations,
        activeInstitutions: activeInstitutions.length,
        activeVouchers: activeVouchers.length,
        lowQuotaVouchers,
        institutionUsage,
      });
    } catch {
      setStatsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminProtected>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{d.title}</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : statsError ? (
          <p className="text-sm text-red-600">{t.errors.genericError}</p>
        ) : stats ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {d.totalRegistrations}
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalRegistrations}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {d.activeInstitutions}
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.activeInstitutions}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{d.institutionUsage}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[...stats.institutionUsage]
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                    .map((inst) => (
                    <div key={inst.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium truncate pr-2" title={inst.name}>{inst.name}</span>
                        <span className="text-gray-600 shrink-0">
                          {inst.used} / {inst.total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${inst.total > 0 ? (inst.used / inst.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AdminProtected>
  );
}
