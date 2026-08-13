'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Wrench } from 'lucide-react';

interface WorkshopVagaItem {
  id: string;
  title: string;
  occurrenceKey: string;
  occurrenceIndex: number;
  capacity: number;
  enrolledCount: number;
  vagasDisponiveis: number;
}

export function DashboardWorkshopsBySection() {
  const { t } = useLanguage();
  const { getIdToken } = useAuth();
  const [items, setItems] = useState<WorkshopVagaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkshopsVagas();
  }, []);

  const loadWorkshopsVagas = async () => {
    try {
      const res = await fetchWithAuth(getIdToken, '/api/admin/workshops/vagas');
      if (!res.ok) throw new Error('Failed to load workshops');
      const data = await res.json();
      setItems(
        data.map((w: WorkshopVagaItem) => ({
          id: w.id,
          title: w.title,
          occurrenceKey: w.occurrenceKey,
          occurrenceIndex: w.occurrenceIndex,
          capacity: w.capacity ?? 0,
          enrolledCount: w.enrolledCount ?? 0,
          vagasDisponiveis: w.vagasDisponiveis ?? 0,
        }))
      );
    } catch (error) {
      console.error('Error loading workshops vagas:', error);
    } finally {
      setLoading(false);
    }
  };

  const bySection = ([] as WorkshopVagaItem[][]).concat(
    [0, 1, 2].map((idx) => items.filter((w) => w.occurrenceIndex === idx))
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {t.admin.dashboard.workshopsBySection}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {t.admin.dashboard.workshopsBySection}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum workshop cadastrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          {t.admin.dashboard.workshopsBySection}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bySection.map((sectionItems, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3 border rounded-lg p-4 bg-gray-50/50">
              <h3 className="text-sm font-semibold text-gray-700">
                {t.admin.dashboard.sessionLabel} {sectionIndex + 1}
              </h3>
              {sectionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum workshop nesta seção.</p>
              ) : (
                <div className="space-y-4">
                  {sectionItems.map((w) => {
                    const total = w.capacity || 1;
                    const percent = Math.min(100, Math.round((w.enrolledCount / total) * 100));
                    return (
                      <div key={w.occurrenceKey} className="space-y-1.5">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-sm font-medium truncate" title={w.title}>
                            {w.title}
                          </span>
                          <span className="text-sm text-muted-foreground shrink-0">
                            {w.enrolledCount} / {w.capacity}
                          </span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
