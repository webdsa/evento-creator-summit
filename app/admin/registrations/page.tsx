'use client';

import { useEffect, useState } from 'react';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Loader2, Download, Mail, MessageCircle, XCircle, Trash2, RotateCcw, PencilLine, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { formatInAppTz } from '@/lib/app-timezone';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

/** Registro completo como retornado pela API (inclui todos os campos do Firestore). */
interface Registration {
  id: string;
  registration_code: string;
  full_name: string;
  email: string;
  email_normalized?: string;
  phone: string;
  gender?: string;
  shirt_size?: string;
  campo?: string;
  plataforma?: string;
  seguidores?: number;
  documento?: string;
  document_country?: string;
  document_type?: string;
  conteudo?: string;
  link_or_handle?: string;
  wants_to_know_novo_tempo?: boolean;
  flight_departure_time?: string;
  flight_departure_airline?: string;
  flight_departure_number?: string;
  flight_return_time?: string;
  flight_return_airline?: string;
  flight_return_number?: string;
  role?: string;
  language: string;
  status: 'confirmed' | 'canceled';
  created_at: string;
  institution_id?: string;
  institution_name?: string;
  voucher_id?: string;
  voucher_code: string;
  institution?: { name: string };
  canceled_at?: string | null;
  canceled_by?: string | null;
  confirmation_email_sent_at?: string | null;
  confirmation_email_last_error?: string | null;
  workshop_ids?: string[];
  workshop_occurrence_keys?: string[];
  checked_in_at?: string | null;
}

export default function RegistrationsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, getIdToken, role } = useAuth();
  const isSecretaria = role === 'secretaria';
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState('');
  const [filterInstitution, setFilterInstitution] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterCheckin, setFilterCheckin] = useState<'' | 'yes' | 'no'>('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterVisitation, setFilterVisitation] = useState<'' | 'yes' | 'no'>('');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resendWhatsAppId, setResendWhatsAppId] = useState<string | null>(null);
  const [nameSortOrder, setNameSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100] as const;

  const sortedRegistrations = useMemo(() => {
    return [...filteredRegistrations].sort((a, b) => {
      const cmp = (a.full_name ?? '').localeCompare(b.full_name ?? '', undefined, { sensitivity: 'base' });
      return nameSortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredRegistrations, nameSortOrder]);

  const totalFiltered = sortedRegistrations.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRegistrations = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedRegistrations.slice(start, start + pageSize);
  }, [sortedRegistrations, pageSize, safePage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterName, filterInstitution, filterRole, filterCheckin, filterLanguage, filterVisitation, pageSize]);

  const getInstitutionName = (reg: Registration) =>
    reg.institution_name ?? (reg.institution && !Array.isArray(reg.institution) ? reg.institution.name : '');

  const formatCheckinAt = (iso: string | null | undefined) =>
    iso ? formatInAppTz(iso, 'dd/MM/yyyy HH:mm') : '—';

  const getWhatsAppLink = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    return `https://api.whatsapp.com/send?phone=${digits}`;
  };

  useEffect(() => {
    if (!user) return;
    loadRegistrations();
  }, [user]);

  useEffect(() => {
    const nameLower = filterName.trim().toLowerCase();
    const roleLower = filterRole.trim().toLowerCase();
    const lang = filterLanguage.trim();

    const filtered = registrations.filter((reg) => {
      if (nameLower && !reg.full_name.toLowerCase().includes(nameLower)) return false;
      if (filterInstitution && getInstitutionName(reg) !== filterInstitution) return false;
      const regRole = (reg.role ?? '').toLowerCase();
      if (roleLower && regRole !== roleLower) return false;
      if (filterCheckin === 'yes' && !reg.checked_in_at) return false;
      if (filterCheckin === 'no' && !!reg.checked_in_at) return false;
      if (lang && reg.language !== lang) return false;
      if (filterVisitation === 'yes' && !reg.wants_to_know_novo_tempo) return false;
      if (filterVisitation === 'no' && reg.wants_to_know_novo_tempo === true) return false;
      return true;
    });
    setFilteredRegistrations(filtered);
  }, [filterName, filterInstitution, filterRole, filterCheckin, filterLanguage, filterVisitation, registrations]);

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(getIdToken, '/api/admin/registrations');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setRegistrations(data);
      setFilteredRegistrations(data);
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      const res = await fetchWithAuth(getIdToken, `/api/admin/registrations/${cancelId}/cancel`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Cancel failed');
      }
      toast({
        title: t.common.success,
        description: t.admin.registrations.canceled,
      });
      setCancelId(null);
      loadRegistrations();
    } catch (error) {
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
      const res = await fetchWithAuth(getIdToken, `/api/admin/registrations/${deleteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Delete failed');
      }
      toast({
        title: t.common.success,
        description: t.admin.registrations.deleted,
      });
      setDeleteId(null);
      loadRegistrations();
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
  };

  const handleReactivate = async (registrationId: string) => {
    try {
      const res = await fetchWithAuth(getIdToken, `/api/admin/registrations/${registrationId}/reactivate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Reactivate failed');
      }
      toast({
        title: t.common.success,
        description: t.admin.registrations.reactivated,
      });
      loadRegistrations();
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
  };

  const handleResendEmail = async (registrationId: string) => {
    try {
      const res = await fetchWithAuth(
        getIdToken,
        `/api/admin/registrations/${registrationId}/resend-email`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error);
      toast({
        title: t.common.success,
        description: t.admin.registrations.emailResent,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errors.genericError;
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: message,
      });
    }
  };

  const handleResendWhatsApp = async (registrationId: string) => {
    setResendWhatsAppId(registrationId);
    try {
      const res = await fetchWithAuth(
        getIdToken,
        `/api/admin/registrations/${registrationId}/resend-whatsapp`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error);
      toast({
        title: t.common.success,
        description: t.admin.registrations.whatsAppSent,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errors.genericError;
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: message,
      });
    } finally {
      setResendWhatsAppId(null);
    }
  };

  const uniqueRoles = Array.from(
    new Set(registrations.map((r) => r.role).filter(Boolean) as string[])
  ).sort();
  const uniqueInstitutions = Array.from(
    new Set(registrations.map((r) => getInstitutionName(r)).filter(Boolean))
  ).sort();
  const languages = [
    { value: 'pt-BR', label: 'Português' },
    { value: 'es', label: 'Español' },
  ];

  const exportToXLSX = () => {
    const rows = filteredRegistrations.map((reg) => {
      const instName = getInstitutionName(reg);
      const formatDate = (d: string | null | undefined) =>
        d ? formatInAppTz(d, 'yyyy-MM-dd HH:mm:ss') : '';
      return {
        [t.admin.registrations.registrationCode]: reg.registration_code,
        [t.admin.registrations.fullName]: reg.full_name,
        [t.admin.registrations.email]: reg.email,
        'E-mail normalizado': reg.email_normalized ?? '',
        [t.admin.registrations.phone]: reg.phone ?? '',
        [t.admin.registrations.gender]: reg.gender ?? '',
        [t.admin.registrations.shirtSize]: reg.shirt_size ?? '',
        [t.admin.registrations.campo]: reg.campo ?? '',
        [t.admin.registrations.plataforma]: reg.plataforma ?? '',
        [t.admin.registrations.seguidores]: reg.seguidores ?? '',
        [t.admin.registrations.documentCountry]: reg.document_country ?? '',
        [t.admin.registrations.documentType]: reg.document_type ?? '',
        [t.admin.registrations.documento]: reg.documento ?? '',
        [t.admin.registrations.conteudo]: reg.conteudo ?? '',
        [t.admin.registrations.linkOrHandle]: reg.link_or_handle ?? '',
        [t.admin.registrations.visitation]:
          reg.wants_to_know_novo_tempo === true ? t.common.yes : t.common.no,
        [t.admin.registrations.flightDepartureAirline]: reg.flight_departure_airline ?? '',
        [t.admin.registrations.flightDepartureNumber]: reg.flight_departure_number ?? '',
        [t.admin.registrations.flightDepartureTime]: reg.flight_departure_time ?? '',
        [t.admin.registrations.flightReturnAirline]: reg.flight_return_airline ?? '',
        [t.admin.registrations.flightReturnNumber]: reg.flight_return_number ?? '',
        [t.admin.registrations.flightReturnTime]: reg.flight_return_time ?? '',
        [t.admin.registrations.role]: reg.role ?? '',
        'ID Instituição': reg.institution_id ?? '',
        [t.admin.registrations.institution]: instName,
        'ID Voucher': reg.voucher_id ?? '',
        [t.admin.registrations.voucher]: reg.voucher_code ?? '',
        [t.admin.registrations.language]: reg.language ?? '',
        [t.admin.registrations.status]: reg.status,
        [t.admin.registrations.createdAt]: formatDate(reg.created_at),
        'Cancelado em': formatDate(reg.canceled_at),
        'Cancelado por': reg.canceled_by ?? '',
        'E-mail confirmação enviado em': formatDate(reg.confirmation_email_sent_at),
        'Erro último e-mail': reg.confirmation_email_last_error ?? '',
        'IDs Workshops': Array.isArray(reg.workshop_ids)
          ? reg.workshop_ids.join('; ')
          : '',
        'Chaves ocorrências workshops': Array.isArray(reg.workshop_occurrence_keys)
          ? reg.workshop_occurrence_keys.join('; ')
          : '',
        'Check-in em': formatDate(reg.checked_in_at),
        ID: reg.id,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscrições');
    XLSX.writeFile(wb, `registrations-${formatInAppTz(Date.now(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <AdminProtected>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{t.admin.registrations.title}</h1>
          <Button onClick={exportToXLSX} className="gap-2">
            <Download className="h-4 w-4" />
            {t.admin.registrations.exportXLSX}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin.registrations.title}</CardTitle>
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t.admin.registrations.fullName}
                </label>
                <Input
                  placeholder={t.common.search}
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="h-9"
                />
              </div>
              {!isSecretaria && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t.admin.registrations.institution}
                </label>
                <Select
                  value={filterInstitution || '_all'}
                  onValueChange={(v) => setFilterInstitution(v === '_all' ? '' : v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t.admin.registrations.institution} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">—</SelectItem>
                    {uniqueInstitutions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t.admin.registrations.role}
                </label>
                <Select
                  value={filterRole || '_all'}
                  onValueChange={(v) => setFilterRole(v === '_all' ? '' : v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t.admin.registrations.role} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">—</SelectItem>
                    {uniqueRoles.map((role) => (
                      <SelectItem key={role} value={role.toLowerCase()}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t.admin.registrations.checkinFilter}
                </label>
                <Select
                  value={filterCheckin || '_all'}
                  onValueChange={(v) => setFilterCheckin((v === '_all' ? '' : v) as '' | 'yes' | 'no')}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t.admin.registrations.checkinFilter} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">—</SelectItem>
                    <SelectItem value="yes">{t.common.yes}</SelectItem>
                    <SelectItem value="no">{t.common.no}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t.admin.registrations.language}
                </label>
                <Select
                  value={filterLanguage || '_all'}
                  onValueChange={(v) => setFilterLanguage(v === '_all' ? '' : v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t.admin.registrations.language} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">—</SelectItem>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {t.admin.registrations.visitation}
                </label>
                <Select
                  value={filterVisitation || '_all'}
                  onValueChange={(v) => setFilterVisitation((v === '_all' ? '' : v) as '' | 'yes' | 'no')}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t.admin.registrations.visitation} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">—</SelectItem>
                    <SelectItem value="yes">{t.common.yes}</SelectItem>
                    <SelectItem value="no">{t.common.no}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="[&_td]:py-0 [&_td]:px-4 [&_th]:py-2 [&_th]:px-4 [&_th]:h-auto [&_tfoot_td]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.admin.registrations.registrationCode}</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 gap-1 font-medium hover:bg-muted"
                          onClick={() => setNameSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                        >
                          {t.admin.registrations.fullName}
                          {nameSortOrder === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>{t.admin.registrations.email}</TableHead>
                      <TableHead>{t.admin.registrations.phone}</TableHead>
                      <TableHead>{t.admin.registrations.institution}</TableHead>
                      <TableHead>{t.admin.registrations.voucher}</TableHead>
                      <TableHead>{t.admin.registrations.visitation}</TableHead>
                      <TableHead>{t.admin.registrations.checkinDateTimeColumn}</TableHead>
                      <TableHead>{t.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRegistrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-mono text-xs">
                          {reg.registration_code}
                        </TableCell>
                        <TableCell>{reg.full_name}</TableCell>
                        <TableCell className="text-sm">{reg.email}</TableCell>
                        <TableCell className="text-sm">
                          {getWhatsAppLink(reg.phone) ? (
                            <a
                              href={getWhatsAppLink(reg.phone)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:underline"
                            >
                              {reg.phone}
                            </a>
                          ) : (
                            reg.phone || '—'
                          )}
                        </TableCell>
                        <TableCell>{getInstitutionName(reg)}</TableCell>
                        <TableCell className="font-mono text-xs">{reg.voucher_code}</TableCell>
                        <TableCell className="text-sm">
                          {reg.wants_to_know_novo_tempo === true ? t.common.yes : t.common.no}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                          {formatCheckinAt(reg.checked_in_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              title={t.admin.registrations.editRegistration}
                            >
                              <Link href={`/admin/registrations/${reg.id}`}>
                                <PencilLine className="h-4 w-4" />
                              </Link>
                            </Button>
                            {reg.status === 'confirmed' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResendEmail(reg.id)}
                                  title={t.admin.registrations.resendEmail}
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResendWhatsApp(reg.id)}
                                  disabled={!reg.phone?.trim() || resendWhatsAppId === reg.id}
                                  title={t.admin.registrations.resendWhatsApp}
                                >
                                  {resendWhatsAppId === reg.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MessageCircle className="h-4 w-4 text-green-600" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCancelId(reg.id)}
                                  title={t.admin.registrations.cancelRegistration}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {reg.status === 'canceled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReactivate(reg.id)}
                                title={t.admin.registrations.reactivateRegistration}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(reg.id)}
                              title={t.admin.registrations.deleteRegistration}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading && totalFiltered > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {t.admin.registrations.perPage}
                  </span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[5rem] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    {t.admin.registrations.showingOf
                      .replace('{from}', String((safePage - 1) * pageSize + 1))
                      .replace('{to}', String(Math.min(safePage * pageSize, totalFiltered)))
                      .replace('{total}', String(totalFiltered))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    {t.admin.registrations.previous}
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {safePage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                  >
                    {t.admin.registrations.nextPage}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.registrations.cancelConfirm}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.registrations.cancelWarning}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>{t.common.confirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.registrations.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.registrations.deleteWarning}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminProtected>
  );
}
