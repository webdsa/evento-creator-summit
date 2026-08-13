'use client';

import { useEffect, useState } from 'react';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import { Loader2, Plus, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { COUNTRY_OPTIONS, type CountryId } from '@/lib/countries';
import type { InstitutionGroup } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface Institution {
  id: string;
  name: string;
  country?: string;
  group?: InstitutionGroup;
  quota_total: number;
  used_count: number;
  status: 'active' | 'inactive';
  created_at: string;
}

function resolveInstitutionGroup(i: Institution): InstitutionGroup {
  const g = i.group;
  if (g === 1 || g === 2 || g === 3) return g;
  return 1;
}

export default function InstitutionsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, getIdToken } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    country: '' as CountryId | '',
    group: 1 as InstitutionGroup,
    quotaTotal: '',
    status: 'active' as 'active' | 'inactive',
  });
  type SortBy = 'name' | 'country';
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterName, setFilterName] = useState('');
  const [filterCountry, setFilterCountry] = useState<string>('');
  /** '' = todos os grupos; '1' | '2' | '3' = filtro por grupo efetivo (inclui legado sem campo → 1). */
  const [filterGroup, setFilterGroup] = useState<string>('');

  const getCountryLabel = (countryId?: string) =>
    countryId ? (COUNTRY_OPTIONS.find((c) => c.id === countryId)?.name ?? countryId) : '';

  const sortedInstitutions = useMemo(() => {
    let list = institutions;
    if (filterName.trim()) {
      const q = filterName.trim().toLowerCase();
      list = list.filter((i) =>
        i.name.toLowerCase().includes(q)
      );
    }
    if (filterCountry) {
      list = list.filter((i) => (i.country ?? '') === filterCountry);
    }
    if (filterGroup === '1' || filterGroup === '2' || filterGroup === '3') {
      const g = Number(filterGroup) as InstitutionGroup;
      list = list.filter((i) => resolveInstitutionGroup(i) === g);
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      } else {
        cmp = getCountryLabel(a.country).localeCompare(getCountryLabel(b.country), undefined, { sensitivity: 'base' });
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [institutions, sortBy, sortOrder, filterName, filterCountry, filterGroup]);

  useEffect(() => {
    if (!user) return;
    loadInstitutions();
  }, [user]);

  const loadInstitutions = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(getIdToken, '/api/admin/institutions');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setInstitutions(data);
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
    setLoading(false);
  };

  const handleOpenDialog = (institution?: Institution) => {
    if (institution) {
      setEditingId(institution.id);
      setFormData({
        name: institution.name,
        country: (institution.country as CountryId) || '',
        group: resolveInstitutionGroup(institution),
        quotaTotal: (institution.quota_total ?? 0).toString(),
        status: institution.status,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        country: '',
        group: 1,
        quotaTotal: '',
        status: 'active',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.quotaTotal) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.requiredField,
      });
      return;
    }
    const quotaTotal = parseInt(formData.quotaTotal);
    if (isNaN(quotaTotal) || quotaTotal < 0) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
      return;
    }
    try {
      if (editingId) {
        const res = await fetchWithAuth(getIdToken, `/api/admin/institutions/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            country: formData.country || undefined,
            group: formData.group,
            quota_total: quotaTotal,
            status: formData.status,
          }),
        });
        if (!res.ok) throw new Error('Update failed');
      } else {
        const res = await fetchWithAuth(getIdToken, '/api/admin/institutions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            country: formData.country || undefined,
            group: formData.group,
            quota_total: quotaTotal,
            status: formData.status,
          }),
        });
        if (!res.ok) throw new Error('Create failed');
      }
      toast({
        title: t.common.success,
        description: t.admin.institutions.saved,
      });
      setDialogOpen(false);
      loadInstitutions();
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetchWithAuth(getIdToken, `/api/admin/institutions/${deleteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      toast({
        title: t.common.success,
        description: t.admin.institutions.deleted,
      });
      setDeleteId(null);
      loadInstitutions();
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
  };

  return (
    <AdminProtected>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{t.admin.institutions.title}</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                {t.admin.institutions.createNew}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId
                    ? t.admin.institutions.editInstitution
                    : t.admin.institutions.createInstitution}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">{t.admin.institutions.name}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="country">{t.admin.institutions.country}</Label>
                  <Select
                    value={formData.country || '__none__'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        country: value === '__none__' ? '' : (value as CountryId),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.admin.institutions.countryPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t.admin.institutions.countryPlaceholder}</SelectItem>
                      {COUNTRY_OPTIONS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="group">{t.admin.institutions.group}</Label>
                  <Select
                    value={String(formData.group)}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        group: Number(value) as InstitutionGroup,
                      })
                    }
                  >
                    <SelectTrigger id="group">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t.admin.institutions.group1}</SelectItem>
                      <SelectItem value="2">{t.admin.institutions.group2}</SelectItem>
                      <SelectItem value="3">{t.admin.institutions.group3}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quotaTotal">{t.admin.institutions.quotaTotal}</Label>
                  <Input
                    id="quotaTotal"
                    type="number"
                    min="0"
                    value={formData.quotaTotal}
                    onChange={(e) => setFormData({ ...formData, quotaTotal: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="status">{t.admin.institutions.status}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'inactive') =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t.common.active}</SelectItem>
                      <SelectItem value="inactive">{t.common.inactive}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button onClick={handleSave}>{t.common.save}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin.institutions.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && (
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="filter-name" className="text-muted-foreground text-sm">
                    {t.admin.institutions.name}
                  </Label>
                  <Input
                    id="filter-name"
                    placeholder={t.admin.institutions.filterNamePlaceholder}
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="filter-country" className="text-muted-foreground text-sm">
                    {t.admin.institutions.country}
                  </Label>
                  <Select
                    value={filterCountry || '__all__'}
                    onValueChange={(v) => setFilterCountry(v === '__all__' ? '' : v)}
                  >
                    <SelectTrigger id="filter-country" className="mt-1">
                      <SelectValue placeholder={t.admin.institutions.filterCountryAll} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t.admin.institutions.filterCountryAll}</SelectItem>
                      {COUNTRY_OPTIONS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="filter-group" className="text-muted-foreground text-sm">
                    {t.admin.institutions.group}
                  </Label>
                  <Select
                    value={filterGroup || '__all__'}
                    onValueChange={(v) => setFilterGroup(v === '__all__' ? '' : v)}
                  >
                    <SelectTrigger id="filter-group" className="mt-1">
                      <SelectValue placeholder={t.admin.institutions.filterGroupAll} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t.admin.institutions.filterGroupAll}</SelectItem>
                      <SelectItem value="1">{t.admin.institutions.group1}</SelectItem>
                      <SelectItem value="2">{t.admin.institutions.group2}</SelectItem>
                      <SelectItem value="3">{t.admin.institutions.group3}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <Table className="[&_td]:py-0 [&_td]:px-4 [&_th]:py-2 [&_th]:px-4 [&_th]:h-auto [&_tfoot_td]:px-4 [&_tfoot_td]:py-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 gap-1 font-medium hover:bg-muted"
                        onClick={() => {
                          setSortBy('name');
                          setSortOrder(sortBy === 'name' ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc');
                        }}
                      >
                        {t.admin.institutions.name}
                        {sortBy === 'name' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 gap-1 font-medium hover:bg-muted"
                        onClick={() => {
                          setSortBy('country');
                          setSortOrder(sortBy === 'country' ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc');
                        }}
                      >
                        {t.admin.institutions.country}
                        {sortBy === 'country' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>{t.admin.institutions.group}</TableHead>
                    <TableHead>{t.admin.institutions.usedCount}</TableHead>
                    <TableHead>{t.admin.institutions.quotaTotal}</TableHead>
                    <TableHead>{t.admin.institutions.remaining}</TableHead>
                    <TableHead>{t.admin.institutions.status}</TableHead>
                    <TableHead>{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedInstitutions.map((institution) => (
                    <TableRow key={institution.id}>
                      <TableCell className="font-medium">{institution.name}</TableCell>
                      <TableCell>
                        {institution.country
                          ? COUNTRY_OPTIONS.find((c) => c.id === institution.country)?.name ?? institution.country
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {
                          [
                            t.admin.institutions.group1,
                            t.admin.institutions.group2,
                            t.admin.institutions.group3,
                          ][resolveInstitutionGroup(institution) - 1]
                        }
                      </TableCell>
                      <TableCell>{institution.used_count ?? 0}</TableCell>
                      <TableCell>{institution.quota_total ?? 0}</TableCell>
                      <TableCell>
                        {(institution.quota_total ?? 0) - (institution.used_count ?? 0)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            institution.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {institution.status === 'active'
                            ? t.common.active
                            : t.common.inactive}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(institution)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(institution.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {sortedInstitutions.length > 0 && (
                  <TableFooter>
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>{t.admin.institutions.total}</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell>
                        {sortedInstitutions.reduce((acc, i) => acc + (i.used_count ?? 0), 0)}
                      </TableCell>
                      <TableCell>
                        {sortedInstitutions.reduce((acc, i) => acc + (i.quota_total ?? 0), 0)}
                      </TableCell>
                      <TableCell>
                        {sortedInstitutions.reduce(
                          (acc, i) =>
                            acc + ((i.quota_total ?? 0) - (i.used_count ?? 0)),
                          0
                        )}
                      </TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.institutions.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.institutions.deleteWarning}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminProtected>
  );
}
