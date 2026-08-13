'use client';

import { useEffect, useState } from 'react';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import { Loader2, Plus, Pencil, Trash2, RefreshCw, Link as LinkIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { datetimeLocalAppToUtcIso, utcIsoToDatetimeLocalForApp } from '@/lib/app-timezone';
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

export const dynamic = 'force-dynamic';

interface Voucher {
  id: string;
  code: string;
  institution_id: string;
  quota_total: number;
  used_count: number;
  status: 'active' | 'paused';
  expires_at: string | null;
  institution?: { name: string };
}

interface Institution {
  id: string;
  name: string;
}

function generateVoucherCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 5;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function VouchersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, getIdToken } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    institutionId: '',
    quotaTotal: '',
    status: 'active' as 'active' | 'paused',
    expiresAt: '',
  });
  const [institutionSortOrder, setInstitutionSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterInstitutionName, setFilterInstitutionName] = useState('');

  const getInstitutionName = (v: Voucher) =>
    v.institution && !Array.isArray(v.institution)
      ? v.institution.name
      : (institutions.find((i) => i.id === v.institution_id)?.name ?? '');

  const sortedVouchers = useMemo(() => {
    let list = vouchers;
    if (filterInstitutionName.trim()) {
      const q = filterInstitutionName.trim().toLowerCase();
      list = list.filter((v) => getInstitutionName(v).toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const nameA = getInstitutionName(a);
      const nameB = getInstitutionName(b);
      const cmp = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      return institutionSortOrder === 'asc' ? cmp : -cmp;
    });
  }, [vouchers, institutionSortOrder, institutions, filterInstitutionName]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vouchersRes, institutionsRes] = await Promise.all([
        fetchWithAuth(getIdToken, '/api/admin/vouchers'),
        fetchWithAuth(getIdToken, '/api/admin/institutions'),
      ]);
      if (vouchersRes.ok) {
        const data = await vouchersRes.json();
        setVouchers(data);
      }
      if (institutionsRes.ok) {
        const data = await institutionsRes.json();
        setInstitutions(data.filter((i: Institution) => i.id && i.name));
      }
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
    setLoading(false);
  };

  const handleOpenDialog = (voucher?: Voucher) => {
    if (voucher) {
      setEditingId(voucher.id);
      setFormData({
        code: voucher.code,
        institutionId: voucher.institution_id,
        quotaTotal: voucher.quota_total.toString(),
        status: voucher.status,
        expiresAt: voucher.expires_at ? utcIsoToDatetimeLocalForApp(voucher.expires_at) : '',
      });
    } else {
      setEditingId(null);
      setFormData({
        code: generateVoucherCode(),
        institutionId: '',
        quotaTotal: '',
        status: 'active',
        expiresAt: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.institutionId || !formData.quotaTotal) {
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
      let expiresAtIso: string | null = null;
      if (formData.expiresAt) {
        try {
          expiresAtIso = datetimeLocalAppToUtcIso(formData.expiresAt);
        } catch {
          toast({
            variant: 'destructive',
            title: t.common.error,
            description: t.errors.genericError,
          });
          return;
        }
      }
      const payload = {
        code: formData.code.toUpperCase(),
        institution_id: formData.institutionId,
        quota_total: quotaTotal,
        status: formData.status,
        expires_at: expiresAtIso,
      };
      if (editingId) {
        const res = await fetchWithAuth(getIdToken, `/api/admin/vouchers/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Update failed');
      } else {
        const res = await fetchWithAuth(getIdToken, '/api/admin/vouchers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Create failed');
      }
      toast({
        title: t.common.success,
        description: t.admin.vouchers.saved,
      });
      setDialogOpen(false);
      loadData();
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
      const res = await fetchWithAuth(getIdToken, `/api/admin/vouchers/${deleteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      toast({
        title: t.common.success,
        description: t.admin.vouchers.deleted,
      });
      setDeleteId(null);
      loadData();
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
  };

  const copyInscriptionLink = (code: string) => {
    const link = `${window.location.origin}/inscricao?code=${code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: t.common.success,
      description: t.admin.vouchers.linkCopied,
    });
  };

  const activeInstitutions = institutions.filter(
    (i) => (i as { status?: string }).status !== 'inactive'
  );

  return (
    <AdminProtected>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{t.admin.vouchers.title}</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                {t.admin.vouchers.createNew}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? t.admin.vouchers.editVoucher : t.admin.vouchers.createVoucher}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="code">{t.admin.vouchers.code}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setFormData({ ...formData, code: generateVoucherCode() })}
                      title={t.admin.vouchers.generateCode}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="institution">{t.admin.vouchers.institution}</Label>
                  <Select
                    value={formData.institutionId}
                    onValueChange={(value) => setFormData({ ...formData, institutionId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(activeInstitutions.length ? activeInstitutions : institutions).map(
                        (inst) => (
                          <SelectItem key={inst.id} value={inst.id}>
                            {inst.name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quotaTotal">{t.admin.vouchers.quotaTotal}</Label>
                  <Input
                    id="quotaTotal"
                    type="number"
                    min="0"
                    value={formData.quotaTotal}
                    onChange={(e) => setFormData({ ...formData, quotaTotal: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="status">{t.admin.vouchers.status}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'paused') =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t.common.active}</SelectItem>
                      <SelectItem value="paused">{t.common.paused}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expiresAt">{t.admin.vouchers.expiresAt}</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
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
            <CardTitle>{t.admin.vouchers.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && (
              <div className="mb-6 max-w-sm">
                <Label htmlFor="filter-institution" className="text-muted-foreground text-sm">
                  {t.admin.vouchers.institution}
                </Label>
                <Input
                  id="filter-institution"
                  placeholder={t.admin.vouchers.filterInstitutionPlaceholder}
                  value={filterInstitutionName}
                  onChange={(e) => setFilterInstitutionName(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <Table className="[&_td]:py-0 [&_td]:px-4 [&_th]:py-2 [&_th]:px-4 [&_th]:h-auto [&_tfoot_td]:py-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin.vouchers.code}</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 gap-1 font-medium hover:bg-muted"
                        onClick={() =>
                          setInstitutionSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                        }
                      >
                        {t.admin.vouchers.institution}
                        {institutionSortOrder === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>{t.admin.vouchers.usedCount}</TableHead>
                    <TableHead>{t.admin.vouchers.quotaTotal}</TableHead>
                    <TableHead>{t.admin.vouchers.remaining}</TableHead>
                    <TableHead>{t.admin.vouchers.status}</TableHead>
                    <TableHead>{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedVouchers.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell className="font-mono font-medium">{voucher.code}</TableCell>
                      <TableCell>
                        {voucher.institution && !Array.isArray(voucher.institution)
                          ? voucher.institution.name
                          : ''}
                      </TableCell>
                      <TableCell>{voucher.used_count ?? 0}</TableCell>
                      <TableCell>{voucher.quota_total ?? 0}</TableCell>
                      <TableCell>{(voucher.quota_total ?? 0) - (voucher.used_count ?? 0)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            voucher.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {voucher.status === 'active' ? t.common.active : t.common.paused}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInscriptionLink(voucher.code)}
                            title={t.admin.vouchers.copyInscriptionLink}
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(voucher)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(voucher.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.vouchers.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.vouchers.deleteWarning}</AlertDialogDescription>
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