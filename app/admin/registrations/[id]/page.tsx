'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { COUNTRY_OPTIONS, type CountryId, isValidCountryId } from '@/lib/countries';
import {
  type DocumentType,
  getDocumentTypesForCountry,
  sanitizeDocumentNumber,
  validateDocument,
} from '@/lib/document';

const GENDER_OPTIONS = ['Masculino', 'Feminino'] as const;
const SHIRT_SIZE_OPTIONS = ['PP', 'P', 'M', 'G', 'GG', 'XG'] as const;
const ROLE_OPTIONS = [
  'Administração',
  'Coordenador',
  'Departamental',
  'Designer',
  'Editor(a)',
  'Gerente',
  'Produtor(a)',
  'Secretária',
] as const;
const LANGUAGES = [
  { value: 'pt-BR', label: 'Português' },
  { value: 'es', label: 'Español' },
] as const;

interface RegistrationData {
  id: string;
  registration_code: string;
  full_name: string;
  email: string;
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
  status: string;
  voucher_code: string;
  institution?: { name: string };
  institution_name?: string;
}

function getInstitutionName(reg: RegistrationData) {
  return reg.institution_name ?? reg.institution?.name ?? '—';
}

export default function EditRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { t } = useLanguage();
  const { toast } = useToast();
  const { getIdToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    gender: '',
    shirt_size: '',
    campo: '',
    plataforma: '',
    seguidores: '',
    documento: '',
    document_country: '',
    document_type: '',
    conteudo: '',
    link_or_handle: '',
    wants_to_know_novo_tempo: '' as '' | 'yes' | 'no',
    flight_departure_time: '',
    flight_departure_airline: '',
    flight_departure_number: '',
    flight_return_time: '',
    flight_return_airline: '',
    flight_return_number: '',
    role: '',
    language: 'pt-BR',
  });

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(getIdToken, `/api/admin/registrations/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setRegistration(null);
            return;
          }
          throw new Error('Failed to load');
        }
        const data: RegistrationData = await res.json();
        setRegistration(data);
        setFormData({
          full_name: data.full_name ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          gender: data.gender ?? '',
          shirt_size: data.shirt_size ?? '',
          campo: data.campo ?? '',
          plataforma: data.plataforma ?? '',
          seguidores: data.seguidores !== undefined && data.seguidores !== null ? String(data.seguidores) : '',
          documento: data.documento ?? '',
          document_country: data.document_country ?? '',
          document_type: data.document_type ?? '',
          conteudo: data.conteudo ?? '',
          link_or_handle: data.link_or_handle ?? '',
          wants_to_know_novo_tempo:
            data.wants_to_know_novo_tempo === true ? 'yes' : data.wants_to_know_novo_tempo === false ? 'no' : '',
          flight_departure_time: data.flight_departure_time ?? '',
          flight_departure_airline: data.flight_departure_airline ?? '',
          flight_departure_number: data.flight_departure_number ?? '',
          flight_return_time: data.flight_return_time ?? '',
          flight_return_airline: data.flight_return_airline ?? '',
          flight_return_number: data.flight_return_number ?? '',
          role: data.role ?? '',
          language: data.language ?? 'pt-BR',
        });
      } catch {
        toast({
          variant: 'destructive',
          title: t.common.error,
          description: t.errors.genericError,
        });
        setRegistration(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, getIdToken, toast, t]);

  const handleSave = async () => {
    if (!registration) return;
    if (!formData.full_name?.trim()) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.requiredField,
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetchWithAuth(getIdToken, `/api/admin/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          gender: formData.gender || undefined,
          shirt_size: formData.shirt_size || undefined,
          campo: formData.campo.trim() || undefined,
          plataforma: formData.plataforma.trim() || undefined,
          seguidores: formData.seguidores.trim() !== '' ? Number(formData.seguidores.replace(/\D/g, '')) : undefined,
          documento: formData.documento.trim() || undefined,
          document_country: formData.document_country || undefined,
          document_type: formData.document_type || undefined,
          conteudo: formData.conteudo.trim() || undefined,
          link_or_handle: formData.link_or_handle.trim() || undefined,
          wants_to_know_novo_tempo:
            formData.wants_to_know_novo_tempo === 'yes'
              ? true
              : formData.wants_to_know_novo_tempo === 'no'
                ? false
                : undefined,
          flight_departure_time: formData.flight_departure_time || undefined,
          flight_departure_airline: formData.flight_departure_airline.trim() || undefined,
          flight_departure_number: formData.flight_departure_number.trim() || undefined,
          flight_return_time: formData.flight_return_time || undefined,
          flight_return_airline: formData.flight_return_airline.trim() || undefined,
          flight_return_number: formData.flight_return_number.trim() || undefined,
          role: formData.role || undefined,
          language: formData.language,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated: RegistrationData = await res.json();
      setRegistration(updated);
      setFormData({
        full_name: updated.full_name ?? '',
        email: updated.email ?? '',
        phone: updated.phone ?? '',
        gender: updated.gender ?? '',
        shirt_size: updated.shirt_size ?? '',
        campo: updated.campo ?? '',
        plataforma: updated.plataforma ?? '',
        seguidores: updated.seguidores !== undefined && updated.seguidores !== null ? String(updated.seguidores) : '',
        documento: updated.documento ?? '',
        document_country: updated.document_country ?? '',
        document_type: updated.document_type ?? '',
        conteudo: updated.conteudo ?? '',
        link_or_handle: updated.link_or_handle ?? '',
        wants_to_know_novo_tempo:
          updated.wants_to_know_novo_tempo === true ? 'yes' : updated.wants_to_know_novo_tempo === false ? 'no' : '',
        flight_departure_time: updated.flight_departure_time ?? '',
        flight_departure_airline: updated.flight_departure_airline ?? '',
        flight_departure_number: updated.flight_departure_number ?? '',
        flight_return_time: updated.flight_return_time ?? '',
        flight_return_airline: updated.flight_return_airline ?? '',
        flight_return_number: updated.flight_return_number ?? '',
        role: updated.role ?? '',
        language: updated.language ?? 'pt-BR',
      });
      toast({
        title: t.common.success,
        description: t.admin.registrations.saved,
      });
      router.push('/admin/registrations');
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminProtected>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AdminProtected>
    );
  }

  if (!registration) {
    return (
      <AdminProtected>
        <div className="space-y-4">
          <p className="text-gray-600">{t.errors.notFound}</p>
          <Button variant="outline" asChild>
            <Link href="/admin/registrations">{t.common.back}</Link>
          </Button>
        </div>
      </AdminProtected>
    );
  }

  return (
    <AdminProtected>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/registrations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{t.admin.registrations.editRegistrationTitle}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin.registrations.editRegistrationTitle}</CardTitle>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>
                <strong>{t.admin.registrations.registrationCode}:</strong>{' '}
                <span className="font-mono">{registration.registration_code}</span>
              </span>
              <span>
                <strong>{t.admin.registrations.institution}:</strong> {getInstitutionName(registration)}
              </span>
              <span>
                <strong>{t.admin.registrations.voucher}:</strong>{' '}
                <span className="font-mono">{registration.voucher_code}</span>
              </span>
              <span>
                <strong>{t.admin.registrations.status}:</strong>{' '}
                {registration.status === 'confirmed' ? t.common.confirmed : t.common.canceled}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t.admin.registrations.fullName}</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder={t.publicInscription.fullNamePlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t.admin.registrations.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t.publicInscription.emailPlaceholder}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t.admin.registrations.phone}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t.publicInscription.phonePlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.admin.registrations.gender}</Label>
                <Select
                  value={formData.gender || '__none__'}
                  onValueChange={(v) => setFormData({ ...formData, gender: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.publicInscription.genderPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.admin.registrations.shirtSize}</Label>
                <Select
                  value={formData.shirt_size || '__none__'}
                  onValueChange={(v) =>
                    setFormData({ ...formData, shirt_size: v === '__none__' ? '' : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.publicInscription.shirtSizePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {SHIRT_SIZE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.admin.registrations.role}</Label>
                <Select
                  value={formData.role || '__none__'}
                  onValueChange={(v) => setFormData({ ...formData, role: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.publicInscription.rolePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.admin.registrations.visitation}</Label>
                <Select
                  value={formData.wants_to_know_novo_tempo || '__none__'}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      wants_to_know_novo_tempo: v === '__none__' ? '' : (v as 'yes' | 'no'),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.admin.registrations.visitation} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    <SelectItem value="yes">{t.common.yes}</SelectItem>
                    <SelectItem value="no">{t.common.no}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campo">{t.admin.registrations.campo}</Label>
                <Input
                  id="campo"
                  value={formData.campo}
                  onChange={(e) => setFormData({ ...formData, campo: e.target.value })}
                  placeholder={t.publicInscription.campoPlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.admin.registrations.documentCountry}</Label>
                <Select
                  value={formData.document_country || '__none__'}
                  onValueChange={(v) => {
                    if (v === '__none__') {
                      setFormData({ ...formData, document_country: '', document_type: '', documento: '' });
                      return;
                    }
                    const country = v as CountryId;
                    const types = getDocumentTypesForCountry(country);
                    setFormData({
                      ...formData,
                      document_country: country,
                      document_type: types.length === 1 ? types[0] : '',
                      documento: '',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.publicInscription.countryPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {COUNTRY_OPTIONS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.admin.registrations.documentType}</Label>
                <Select
                  value={formData.document_type || '__none__'}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      document_type: v === '__none__' ? '' : v,
                      documento: '',
                    })
                  }
                  disabled={!formData.document_country}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.publicInscription.documentTypePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {(isValidCountryId(formData.document_country)
                      ? getDocumentTypesForCountry(formData.document_country)
                      : []
                    ).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {t.publicInscription.documentTypeOptions[opt] ?? opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="documento">{t.admin.registrations.documento}</Label>
                <Input
                  id="documento"
                  value={formData.documento}
                  onChange={(e) => {
                    if (!isValidCountryId(formData.document_country) || !formData.document_type) {
                      setFormData({ ...formData, documento: e.target.value.toUpperCase() });
                      return;
                    }
                    setFormData({
                      ...formData,
                      documento: sanitizeDocumentNumber(
                        formData.document_country,
                        formData.document_type as DocumentType,
                        e.target.value
                      ),
                    });
                  }}
                  placeholder={t.publicInscription.documentoPlaceholder}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plataforma">{t.admin.registrations.plataforma}</Label>
                <Input
                  id="plataforma"
                  value={formData.plataforma}
                  onChange={(e) => setFormData({ ...formData, plataforma: e.target.value })}
                  placeholder={t.publicInscription.plataformaPlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seguidores">{t.admin.registrations.seguidores}</Label>
                <Input
                  id="seguidores"
                  inputMode="numeric"
                  value={formData.seguidores}
                  onChange={(e) =>
                    setFormData({ ...formData, seguidores: e.target.value.replace(/\D/g, '') })
                  }
                  placeholder={t.publicInscription.seguidoresPlaceholder}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conteudo">{t.admin.registrations.conteudo}</Label>
                <Input
                  id="conteudo"
                  value={formData.conteudo}
                  onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                  placeholder={t.publicInscription.conteudoPlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link_or_handle">{t.admin.registrations.linkOrHandle}</Label>
                <Input
                  id="link_or_handle"
                  value={formData.link_or_handle}
                  onChange={(e) => setFormData({ ...formData, link_or_handle: e.target.value })}
                  placeholder={t.publicInscription.linkOrHandlePlaceholder}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="flight_departure_airline">{t.admin.registrations.flightDepartureAirline}</Label>
                <Input
                  id="flight_departure_airline"
                  value={formData.flight_departure_airline}
                  onChange={(e) => setFormData({ ...formData, flight_departure_airline: e.target.value })}
                  placeholder="LATAM, Gol, Azul..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flight_departure_number">{t.admin.registrations.flightDepartureNumber}</Label>
                <Input
                  id="flight_departure_number"
                  value={formData.flight_departure_number}
                  onChange={(e) => setFormData({ ...formData, flight_departure_number: e.target.value })}
                  placeholder="LA 3094"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flight_departure_time">{t.admin.registrations.flightDepartureTime}</Label>
                <Input
                  id="flight_departure_time"
                  type="time"
                  value={formData.flight_departure_time}
                  onChange={(e) => setFormData({ ...formData, flight_departure_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="flight_return_airline">{t.admin.registrations.flightReturnAirline}</Label>
                <Input
                  id="flight_return_airline"
                  value={formData.flight_return_airline}
                  onChange={(e) => setFormData({ ...formData, flight_return_airline: e.target.value })}
                  placeholder="LATAM, Gol, Azul..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flight_return_number">{t.admin.registrations.flightReturnNumber}</Label>
                <Input
                  id="flight_return_number"
                  value={formData.flight_return_number}
                  onChange={(e) => setFormData({ ...formData, flight_return_number: e.target.value })}
                  placeholder="LA 3095"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flight_return_time">{t.admin.registrations.flightReturnTime}</Label>
                <Input
                  id="flight_return_time"
                  type="time"
                  value={formData.flight_return_time}
                  onChange={(e) => setFormData({ ...formData, flight_return_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="max-w-xs space-y-2">
                <Label>{t.admin.registrations.language}</Label>
                <Select
                  value={formData.language}
                  onValueChange={(v) => setFormData({ ...formData, language: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t.common.save}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/registrations">{t.common.cancel}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminProtected>
  );
}
