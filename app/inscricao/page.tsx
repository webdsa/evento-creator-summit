'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { Header } from '@/components/Header';
import { PublicFooter } from '@/components/PublicFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const GENDER_OPTIONS = ['Masculino', 'Feminino'] as const;
const ROLE_OPTIONS = ['Administração', 'Coordenador', 'Departamental', 'Designer', 'Editor(a)', 'Gerente', 'Produtor(a)', 'Secretária'] as const;
const SHIRT_SIZE_OPTIONS = ['PP', 'P', 'M', 'G', 'GG', 'XG'] as const;

import { type CountryId, isValidCountryId, getDefaultLanguageForCountry } from '@/lib/countries';
import { InstitutionGroupBanner } from '@/lib/institution-group-banner';

const COUNTRY_PHONE_OPTIONS: {
  id: CountryId;
  name: string;
  ddi: string;
  maxDigits: number;
  placeholder: string;
  format: (digits: string) => string;
}[] = [
  {
    id: 'BR',
    name: 'Brasil',
    ddi: '55',
    maxDigits: 11,
    placeholder: '(11) 99999-9999',
    format: (d) => {
      const s = d.replace(/\D/g, '').slice(0, 11);
      if (s.length <= 2) return s ? `(${s}` : '';
      if (s.length <= 7) return `(${s.slice(0, 2)}) ${s.slice(2)}`;
      return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
    },
  },
  {
    id: 'AR',
    name: 'Argentina',
    ddi: '54',
    maxDigits: 10,
    placeholder: '(11) 1234-5678',
    format: (d) => {
      const s = d.replace(/\D/g, '').slice(0, 10);
      if (s.length <= 2) return s ? `(${s}` : '';
      return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`;
    },
  },
  {
    id: 'CL',
    name: 'Chile',
    ddi: '56',
    maxDigits: 9,
    placeholder: '9 1234 5678',
    format: (d) => {
      const s = d.replace(/\D/g, '').slice(0, 9);
      if (s.length <= 1) return s;
      if (s.length <= 5) return `${s.slice(0, 1)} ${s.slice(1)}`;
      return `${s.slice(0, 1)} ${s.slice(1, 5)} ${s.slice(5)}`;
    },
  },
  {
    id: 'UY',
    name: 'Uruguai',
    ddi: '598',
    maxDigits: 8,
    placeholder: '99 123 45 67',
    format: (d) => {
      const s = d.replace(/\D/g, '').slice(0, 8);
      if (s.length <= 2) return s;
      if (s.length <= 5) return `${s.slice(0, 2)} ${s.slice(2)}`;
      if (s.length <= 7) return `${s.slice(0, 2)} ${s.slice(2, 5)} ${s.slice(5)}`;
      return `${s.slice(0, 2)} ${s.slice(2, 5)} ${s.slice(5, 7)} ${s.slice(7)}`;
    },
  },
  {
    id: 'BO',
    name: 'Bolívia',
    ddi: '591',
    maxDigits: 8,
    placeholder: '7123 4567',
    format: (d) => {
      const s = d.replace(/\D/g, '').slice(0, 8);
      if (s.length <= 2) return s;
      if (s.length <= 5) return `${s.slice(0, 2)} ${s.slice(2)}`;
      if (s.length <= 7) return `${s.slice(0, 2)} ${s.slice(2, 5)} ${s.slice(5)}`;
      return `${s.slice(0, 2)} ${s.slice(2, 5)} ${s.slice(5, 7)} ${s.slice(7)}`;
    },
  },
  {
    id: 'PY',
    name: 'Paraguai',
    ddi: '595',
    maxDigits: 9,
    placeholder: '981 123 456',
    format: (d) => {
      const s = d.replace(/\D/g, '').slice(0, 9);
      if (s.length <= 3) return s;
      if (s.length <= 6) return `${s.slice(0, 3)} ${s.slice(3)}`;
      return `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}`;
    },
  },
  {
    id: 'PE',
    name: 'Peru',
    ddi: '51',
    maxDigits: 9,
    placeholder: '999 123 456',
    format: (d) => {
      const s = d.replace(/\D/g, '').slice(0, 9);
      if (s.length <= 3) return s;
      if (s.length <= 6) return `${s.slice(0, 3)} ${s.slice(3)}`;
      return `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}`;
    },
  },
  {
    id: 'EC',
    name: 'Equador',
    ddi: '593',
    maxDigits: 9,
    placeholder: '099 123 4567',
    format: (d) => {
      const s = d.replace(/\D/g, '').slice(0, 9);
      if (s.length <= 3) return s;
      if (s.length <= 6) return `${s.slice(0, 3)} ${s.slice(3)}`;
      return `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}`;
    },
  },
];
import { useToast } from '@/hooks/use-toast';

interface VoucherValidation {
  valid: boolean;
  voucher?: {
    id: string;
    code: string;
    quotaTotal: number;
    usedCount: number;
    remaining: number;
    institution: {
      id: string;
      name: string;
      country?: string;
      quotaTotal: number;
      usedCount: number;
      remaining: number;
      vouchersWithQuotaCount?: number;
    };
  };
  error?: string;
}

interface RegistrationSuccess {
  registrationCode: string;
  fullName: string;
  email: string;
  phone: string;
  gender?: string;
  shirtSize?: string;
  campo?: string;
  plataforma?: string;
  seguidores?: number;
  documento?: string;
  conteudo?: string;
  linkOrHandle?: string;
  wantsToKnowNovoTempo?: boolean;
  tourNt?: boolean;
  flightDepartureTime?: string;
  flightReturnTime?: string;
  role?: string;
  institution: string;
  institutionGroup?: 1 | 2 | 3;
}

function InscricaoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const { user: adminUser } = useAuth();
  const isAdminLoggedIn = !!adminUser;

  const [voucherCode, setVoucherCode] = useState('');
  const [voucherValidation, setVoucherValidation] = useState<VoucherValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<RegistrationSuccess | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneCountry: '' as CountryId | '',
    phone: '',
    gender: '' as string,
    shirtSize: '',
    campo: '',
    plataforma: '',
    seguidores: '',
    documento: '',
    conteudo: '',
    linkOrHandle: '',
    wantsToKnowNovoTempo: false,
    tourNt: false,
    flightDepartureTime: '',
    flightReturnTime: '',
    role: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setVoucherCode(code.toUpperCase());
      validateVoucher(code.toUpperCase());
    }
  }, [searchParams]);

  const validateVoucher = async (code: string) => {
    setIsValidating(true);
    setVoucherValidation(null);
    setErrors({});

    try {
      const response = await fetch(`/api/public/voucher/validate?code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (!response.ok) {
        setVoucherValidation({
          valid: false,
          error: data.error || t.errors.voucherNotFound,
        });
        return;
      }

      setVoucherValidation({
        valid: true,
        voucher: data,
      });
      const instCountry = data.institution?.country;
      if (instCountry && isValidCountryId(instCountry)) {
        setFormData((prev) => ({ ...prev, phoneCountry: instCountry }));
        setLanguage(getDefaultLanguageForCountry(instCountry));
      }
    } catch (error) {
      setVoucherValidation({
        valid: false,
        error: t.errors.genericError,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidateClick = () => {
    if (!voucherCode.trim()) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.requiredField,
      });
      return;
    }
    validateVoucher(voucherCode.toUpperCase());
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = t.errors.requiredField;
    }

    if (!formData.email.trim()) {
      newErrors.email = t.errors.requiredField;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t.errors.invalidEmail;
    }

    if (!formData.phoneCountry) {
      newErrors.phoneCountry = t.errors.requiredField;
    }
    if (!formData.phone.trim()) {
      newErrors.phone = t.errors.requiredField;
    } else if (formData.phoneCountry) {
      const country = COUNTRY_PHONE_OPTIONS.find((c) => c.id === formData.phoneCountry);
      const digits = formData.phone.replace(/\D/g, '');
      if (country && digits.length !== country.maxDigits) {
        newErrors.phone = t.errors.invalidPhone;
      }
    }

    if (!formData.gender) {
      newErrors.gender = t.errors.requiredField;
    }

    if (!formData.role.trim()) {
      newErrors.role = t.errors.requiredField;
    } else if (!ROLE_OPTIONS.includes(formData.role as (typeof ROLE_OPTIONS)[number])) {
      newErrors.role = t.errors.requiredField;
    }

    if (!formData.campo.trim()) {
      newErrors.campo = t.errors.requiredField;
    }
    if (!formData.plataforma.trim()) {
      newErrors.plataforma = t.errors.requiredField;
    }
    if (!formData.seguidores.trim()) {
      newErrors.seguidores = t.errors.requiredField;
    } else if (!/^\d+$/.test(formData.seguidores.trim())) {
      newErrors.seguidores = t.errors.requiredField;
    }
    if (!formData.documento.trim()) {
      newErrors.documento = t.errors.requiredField;
    }
    if (!formData.conteudo.trim()) {
      newErrors.conteudo = t.errors.requiredField;
    }
    if (!formData.linkOrHandle.trim()) {
      newErrors.linkOrHandle = t.errors.requiredField;
    }
    if (!formData.shirtSize) {
      newErrors.shirtSize = t.errors.requiredField;
    } else if (!SHIRT_SIZE_OPTIONS.includes(formData.shirtSize as (typeof SHIRT_SIZE_OPTIONS)[number])) {
      newErrors.shirtSize = t.errors.requiredField;
    }
    if (!formData.flightDepartureTime) {
      newErrors.flightDepartureTime = t.errors.requiredField;
    }
    if (!formData.flightReturnTime) {
      newErrors.flightReturnTime = t.errors.requiredField;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const country = COUNTRY_PHONE_OPTIONS.find((c) => c.id === formData.phoneCountry);
      const phoneDigits = formData.phone.replace(/\D/g, '');
      const fullPhone = country ? `+${country.ddi}${phoneDigits}` : formData.phone;

      const response = await fetch('/api/public/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voucherCode: voucherCode.toUpperCase(),
          fullName: formData.fullName,
          email: formData.email,
          phone: fullPhone,
          gender: formData.gender,
          shirtSize: formData.shirtSize,
          campo: formData.campo,
          plataforma: formData.plataforma,
          seguidores: Number(formData.seguidores.replace(/\D/g, '')),
          documento: formData.documento,
          conteudo: formData.conteudo,
          linkOrHandle: formData.linkOrHandle,
          wantsToKnowNovoTempo: formData.wantsToKnowNovoTempo,
          tourNt: formData.tourNt,
          flightDepartureTime: formData.flightDepartureTime,
          flightReturnTime: formData.flightReturnTime,
          role: formData.role,
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: t.common.error,
          description: data.error || t.errors.registrationFailed,
        });
        return;
      }

      const ig = data.institutionGroup;
      setSuccess({
        registrationCode: data.registrationCode,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        shirtSize: data.shirtSize,
        campo: data.campo,
        plataforma: data.plataforma,
        seguidores: data.seguidores,
        documento: data.documento,
        conteudo: data.conteudo,
        linkOrHandle: data.linkOrHandle,
        wantsToKnowNovoTempo: data.wantsToKnowNovoTempo,
        tourNt: data.tourNt,
        flightDepartureTime: data.flightDepartureTime,
        flightReturnTime: data.flightReturnTime,
        role: data.role,
        institution: data.institution,
        institutionGroup: ig === 1 || ig === 2 || ig === 3 ? ig : undefined,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="public-area page-inscricao min-h-screen min-w-0 overflow-x-hidden flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col justify-center container max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
          <div className="animate-scale-in">
            <Card className="glass-card border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl">
              <CardHeader className="text-center pb-6 sm:pb-8 px-4 sm:px-6">
                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-400 rounded-full blur-2xl opacity-40 animate-pulse"></div>
                    <CheckCircle2 className="relative h-16 w-16 sm:h-20 sm:w-20 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-green-900 mb-2">
                  {t.publicInscription.successTitle}
                </CardTitle>
                <CardDescription className="text-base sm:text-lg text-green-700">
                  {t.publicInscription.successMessage}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 border-2 border-green-200 shadow-lg">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 mb-2">
                      {t.publicInscription.registrationCode}
                    </p>
                    <p className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent tracking-wider break-all">
                      {success.registrationCode}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-green-100 shadow-lg">
                  <h3 className="font-semibold text-gray-900 mb-4 sm:mb-6 text-base sm:text-lg">
                    {t.publicInscription.registrationDetails}
                  </h3>
                  <dl className="space-y-3 sm:space-y-4">
                    <div className="border-b border-gray-100 pb-3">
                      <dt className="text-sm font-medium text-gray-500 mb-1">
                        {t.publicInscription.fullName}
                      </dt>
                      <dd className="font-semibold text-gray-900">{success.fullName}</dd>
                    </div>
                    <div className="border-b border-gray-100 pb-3">
                      <dt className="text-sm font-medium text-gray-500 mb-1">
                        {t.publicInscription.email}
                      </dt>
                      <dd className="font-semibold text-gray-900">{success.email}</dd>
                    </div>
                    <div className="border-b border-gray-100 pb-3">
                      <dt className="text-sm font-medium text-gray-500 mb-1">
                        {t.publicInscription.phone}
                      </dt>
                      <dd className="font-semibold text-gray-900">{success.phone}</dd>
                    </div>
                    {success.gender && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.gender}
                        </dt>
                        <dd className="font-semibold text-gray-900">{success.gender}</dd>
                      </div>
                    )}
                    {success.wantsToKnowNovoTempo && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.wantsToKnowNovoTempo}
                        </dt>
                        <dd className="font-semibold text-gray-900">{t.common.yes}</dd>
                      </div>
                    )}
                    {success.role && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.role}
                        </dt>
                        <dd className="font-semibold text-gray-900">
                          {t.publicInscription.roleOptions[success.role] ?? success.role}
                        </dd>
                      </div>
                    )}
                    {success.campo && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.campo}
                        </dt>
                        <dd className="font-semibold text-gray-900">{success.campo}</dd>
                      </div>
                    )}
                    {success.plataforma && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.plataforma}
                        </dt>
                        <dd className="font-semibold text-gray-900">{success.plataforma}</dd>
                      </div>
                    )}
                    {success.seguidores !== undefined && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.seguidores}
                        </dt>
                        <dd className="font-semibold text-gray-900">{success.seguidores}</dd>
                      </div>
                    )}
                    {success.documento && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.documento}
                        </dt>
                        <dd className="font-semibold text-gray-900">{success.documento}</dd>
                      </div>
                    )}
                    {success.conteudo && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.conteudo}
                        </dt>
                        <dd className="font-semibold text-gray-900">{success.conteudo}</dd>
                      </div>
                    )}
                    {success.linkOrHandle && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.linkOrHandle}
                        </dt>
                        <dd className="font-semibold text-gray-900">{success.linkOrHandle}</dd>
                      </div>
                    )}
                    {success.shirtSize && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.shirtSize}
                        </dt>
                        <dd className="font-semibold text-gray-900">{success.shirtSize}</dd>
                      </div>
                    )}
                    {success.tourNt && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.tourNt}
                        </dt>
                        <dd className="font-semibold text-gray-900">{t.common.yes}</dd>
                      </div>
                    )}
                    {success.flightDepartureTime && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.flightDepartureTime}
                        </dt>
                        <dd className="font-semibold text-gray-900">{success.flightDepartureTime}</dd>
                      </div>
                    )}
                    {success.flightReturnTime && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.flightReturnTime}
                        </dt>
                        <dd className="font-semibold text-gray-900">{success.flightReturnTime}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-500 mb-1">
                        {t.publicInscription.institution}
                      </dt>
                      <dd className="font-semibold text-gray-900">{success.institution}</dd>
                    </div>
                  </dl>
                </div>

                <Alert className="bg-blue-50 border-2 border-blue-200 shadow-md text-sm sm:text-base">
                  <AlertDescription className="text-blue-900 font-medium">
                    {t.publicInscription.checkEmailConfirmation}
                  </AlertDescription>
                </Alert>

                {success.institutionGroup !== undefined && (
                  <InstitutionGroupBanner
                    group={success.institutionGroup}
                    groupLabel={t.checkStatus.institutionGroup}
                    groupTitle={
                      [
                        t.checkStatus.group1,
                        t.checkStatus.group2,
                        t.checkStatus.group3,
                      ][success.institutionGroup - 1]
                    }
                    colorName={
                      [
                        t.checkStatus.groupColorRed,
                        t.checkStatus.groupColorGreen,
                        t.checkStatus.groupColorBlue,
                      ][success.institutionGroup - 1]
                    }
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="public-area page-inscricao min-h-screen min-w-0 overflow-x-hidden flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col justify-center container max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 gradient-text-hero px-1">
            {t.publicInscription.title}
          </h1>
          <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto px-1">
            {t.publicInscription.subtitle}
          </p>
        </div>

        {!voucherValidation?.valid && (
          <div className="animate-slide-up">
            <Card className="glass-card mb-4 sm:mb-6 shadow-xl border-2 border-white/30 hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="px-4 sm:px-6 pb-2">
                <CardTitle className="text-xl sm:text-2xl">{t.publicInscription.enterVoucher}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder={t.publicInscription.voucherPlaceholder}
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleValidateClick();
                      }
                    }}
                    disabled={isValidating}
                    className="text-base sm:text-lg font-mono h-12 min-h-[44px]"
                  />
                  <Button
                    onClick={handleValidateClick}
                    disabled={isValidating}
                    size="lg"
                    className="btn-primary-cta sm:w-auto w-full shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t.publicInscription.validateVoucher}
                  </Button>
                </div>

                {voucherValidation && !voucherValidation.valid && (
                  <Alert variant="destructive" className="mt-4 animate-scale-in">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {voucherValidation.error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {voucherValidation?.valid && voucherValidation.voucher && (
          <>
            <div className="animate-slide-up mb-4 sm:mb-6">
              <Card className="glass-card border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl">
                <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                  <div className="space-y-4">
                    <div className="text-center pb-4 border-b border-green-200">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {t.publicInscription.institution}
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900 break-words">
                        {voucherValidation.voucher.institution.name}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-green-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">
                        {t.publicInscription.voucherCodeLabel}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold font-mono tracking-wider bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent break-all">
                        {voucherValidation.voucher.code}
                      </p>
                    </div>
                    {isAdminLoggedIn && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-green-200">
                          <p className="text-sm font-medium text-gray-600 mb-2">
                            {t.publicInscription.voucherQuotaRemaining}
                          </p>
                          <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {voucherValidation.voucher.remaining ?? 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {t.publicInscription.availableInOneVoucher}
                          </p>
                        </div>
                        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border border-green-200">
                          <p className="text-sm font-medium text-gray-600 mb-2">
                            {t.publicInscription.institutionQuotaRemaining}
                          </p>
                          <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {voucherValidation.voucher.institution.remaining ?? 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {t.publicInscription.availableInVouchersCount.replace(
                              '{count}',
                              String(voucherValidation.voucher.institution.vouchersWithQuotaCount ?? 0)
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <Card className="glass-card shadow-xl border-2 border-white/30">
                <CardHeader className="px-4 sm:px-6 pb-2">
                  <CardTitle className="text-xl sm:text-2xl">{t.publicInscription.formTitle}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm sm:text-base font-semibold">
                        {t.publicInscription.fullName}
                      </Label>
                      <Input
                        id="fullName"
                        placeholder={t.publicInscription.fullNamePlaceholder}
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        className={`h-12 min-h-[44px] ${errors.fullName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {errors.fullName && (
                        <p className="text-sm text-red-600 mt-1 font-medium">{errors.fullName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm sm:text-base font-semibold">
                        {t.publicInscription.email}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t.publicInscription.emailPlaceholder}
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className={`h-12 min-h-[44px] ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-600 mt-1 font-medium">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-semibold">
                        {t.publicInscription.phone}
                      </Label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Select
                          value={formData.phoneCountry || undefined}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              phoneCountry: value as CountryId,
                              phone: '',
                            })
                          }
                        >
                          <SelectTrigger
                            className={`h-12 min-h-[44px] sm:w-[180px] w-full ${errors.phoneCountry ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                          >
                            <SelectValue placeholder={t.publicInscription.countryPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRY_PHONE_OPTIONS.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name} (+{c.ddi})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder={
                            formData.phoneCountry
                              ? COUNTRY_PHONE_OPTIONS.find((c) => c.id === formData.phoneCountry)?.placeholder ??
                                t.publicInscription.phonePlaceholder
                              : t.publicInscription.phonePlaceholder
                          }
                          value={
                            formData.phoneCountry
                              ? COUNTRY_PHONE_OPTIONS.find((c) => c.id === formData.phoneCountry)?.format(
                                  formData.phone
                                ) ?? formData.phone
                              : formData.phone
                          }
                          onChange={(e) => {
                            const country = formData.phoneCountry
                              ? COUNTRY_PHONE_OPTIONS.find((c) => c.id === formData.phoneCountry)
                              : null;
                            const digits = e.target.value.replace(/\D/g, '');
                            const limited = country ? digits.slice(0, country.maxDigits) : digits;
                            setFormData({ ...formData, phone: limited });
                          }}
                          disabled={!formData.phoneCountry}
                          className={`h-12 min-h-[44px] flex-1 min-w-0 ${errors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        />
                      </div>
                      {(errors.phoneCountry || errors.phone) && (
                        <p className="text-sm text-red-600 mt-1 font-medium">
                          {errors.phoneCountry || errors.phone}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-semibold">
                        {t.publicInscription.gender}
                      </Label>
                      <Select
                        value={formData.gender || undefined}
                        onValueChange={(value) => setFormData({ ...formData, gender: value })}
                      >
                        <SelectTrigger
                          className={`h-12 min-h-[44px] ${errors.gender ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        >
                          <SelectValue placeholder={t.publicInscription.genderPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.gender && (
                        <p className="text-sm text-red-600 mt-1 font-medium">{errors.gender}</p>
                      )}
                    </div>

                    <div className="inscription-checkbox-novo-tempo flex items-center gap-3 py-1">
                      <Checkbox
                        id="wantsToKnowNovoTempo"
                        checked={formData.wantsToKnowNovoTempo}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, wantsToKnowNovoTempo: checked === true })
                        }
                        className="h-5 w-5 shrink-0"
                      />
                      <Label
                        htmlFor="wantsToKnowNovoTempo"
                        className="text-sm sm:text-base font-medium cursor-pointer leading-tight text-gray-900"
                      >
                        {t.publicInscription.wantsToKnowNovoTempo}
                      </Label>
                    </div>

                    <div className="flex items-center gap-3 py-1">
                      <Checkbox
                        id="tourNt"
                        checked={formData.tourNt}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, tourNt: checked === true })
                        }
                        className="h-5 w-5 shrink-0"
                      />
                      <Label
                        htmlFor="tourNt"
                        className="text-sm sm:text-base font-medium cursor-pointer leading-tight text-gray-900"
                      >
                        {t.publicInscription.tourNt}
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-sm sm:text-base font-semibold">
                        {t.publicInscription.role}
                      </Label>
                      <Select
                        value={formData.role || undefined}
                        onValueChange={(value) => setFormData({ ...formData, role: value })}
                      >
                        <SelectTrigger
                          id="role"
                          className={`h-12 min-h-[44px] ${errors.role ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        >
                          <SelectValue placeholder={t.publicInscription.rolePlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {t.publicInscription.roleOptions[opt] ?? opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.role && (
                        <p className="text-sm text-red-600 mt-1 font-medium">{errors.role}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="campo" className="text-sm sm:text-base font-semibold">
                        {t.publicInscription.campo}
                      </Label>
                      <Input
                        id="campo"
                        placeholder={t.publicInscription.campoPlaceholder}
                        value={formData.campo}
                        onChange={(e) => setFormData({ ...formData, campo: e.target.value })}
                        className={`h-12 min-h-[44px] ${errors.campo ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {errors.campo && (
                        <p className="text-sm text-red-600 mt-1 font-medium">{errors.campo}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plataforma" className="text-sm sm:text-base font-semibold">
                        {t.publicInscription.plataforma}
                      </Label>
                      <Input
                        id="plataforma"
                        placeholder={t.publicInscription.plataformaPlaceholder}
                        value={formData.plataforma}
                        onChange={(e) => setFormData({ ...formData, plataforma: e.target.value })}
                        className={`h-12 min-h-[44px] ${errors.plataforma ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {errors.plataforma && (
                        <p className="text-sm text-red-600 mt-1 font-medium">{errors.plataforma}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="seguidores" className="text-sm sm:text-base font-semibold">
                        {t.publicInscription.seguidores}
                      </Label>
                      <Input
                        id="seguidores"
                        type="text"
                        inputMode="numeric"
                        placeholder={t.publicInscription.seguidoresPlaceholder}
                        value={formData.seguidores}
                        onChange={(e) =>
                          setFormData({ ...formData, seguidores: e.target.value.replace(/\D/g, '') })
                        }
                        className={`h-12 min-h-[44px] ${errors.seguidores ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {errors.seguidores && (
                        <p className="text-sm text-red-600 mt-1 font-medium">{errors.seguidores}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="documento" className="text-sm sm:text-base font-semibold">
                        {t.publicInscription.documento}
                      </Label>
                      <Input
                        id="documento"
                        placeholder={t.publicInscription.documentoPlaceholder}
                        value={formData.documento}
                        onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                        className={`h-12 min-h-[44px] ${errors.documento ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {errors.documento && (
                        <p className="text-sm text-red-600 mt-1 font-medium">{errors.documento}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="conteudo" className="text-sm sm:text-base font-semibold">
                        {t.publicInscription.conteudo}
                      </Label>
                      <Input
                        id="conteudo"
                        placeholder={t.publicInscription.conteudoPlaceholder}
                        value={formData.conteudo}
                        onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                        className={`h-12 min-h-[44px] ${errors.conteudo ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {errors.conteudo && (
                        <p className="text-sm text-red-600 mt-1 font-medium">{errors.conteudo}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkOrHandle" className="text-sm sm:text-base font-semibold">
                        {t.publicInscription.linkOrHandle}
                      </Label>
                      <Input
                        id="linkOrHandle"
                        placeholder={t.publicInscription.linkOrHandlePlaceholder}
                        value={formData.linkOrHandle}
                        onChange={(e) => setFormData({ ...formData, linkOrHandle: e.target.value })}
                        className={`h-12 min-h-[44px] ${errors.linkOrHandle ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {errors.linkOrHandle && (
                        <p className="text-sm text-red-600 mt-1 font-medium">{errors.linkOrHandle}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base font-semibold">
                        {t.publicInscription.shirtSize}
                      </Label>
                      <Select
                        value={formData.shirtSize || undefined}
                        onValueChange={(value) => setFormData({ ...formData, shirtSize: value })}
                      >
                        <SelectTrigger
                          className={`h-12 min-h-[44px] ${errors.shirtSize ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        >
                          <SelectValue placeholder={t.publicInscription.shirtSizePlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {SHIRT_SIZE_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.shirtSize && (
                        <p className="text-sm text-red-600 mt-1 font-medium">{errors.shirtSize}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="flightDepartureTime" className="text-sm sm:text-base font-semibold">
                          {t.publicInscription.flightDepartureTime}
                        </Label>
                        <Input
                          id="flightDepartureTime"
                          type="time"
                          value={formData.flightDepartureTime}
                          onChange={(e) =>
                            setFormData({ ...formData, flightDepartureTime: e.target.value })
                          }
                          className={`h-12 min-h-[44px] ${errors.flightDepartureTime ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        />
                        {errors.flightDepartureTime && (
                          <p className="text-sm text-red-600 mt-1 font-medium">
                            {errors.flightDepartureTime}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="flightReturnTime" className="text-sm sm:text-base font-semibold">
                          {t.publicInscription.flightReturnTime}
                        </Label>
                        <Input
                          id="flightReturnTime"
                          type="time"
                          value={formData.flightReturnTime}
                          onChange={(e) =>
                            setFormData({ ...formData, flightReturnTime: e.target.value })
                          }
                          className={`h-12 min-h-[44px] ${errors.flightReturnTime ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        />
                        {errors.flightReturnTime && (
                          <p className="text-sm text-red-600 mt-1 font-medium">
                            {errors.flightReturnTime}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="btn-primary-cta w-full min-h-[48px] h-12 sm:h-14 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      {t.publicInscription.submitInscription}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

export default function InscricaoPage() {
  return (
    <Suspense
      fallback={
        <div className="public-area min-h-screen flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      }
    >
      <InscricaoContent />
    </Suspense>
  );
}
