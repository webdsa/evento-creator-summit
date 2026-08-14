'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { Header } from '@/components/Header';
import { PublicFooter } from '@/components/PublicFooter';
import { PublicPageHeader } from '@/components/brand/PublicPageHeader';
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
const SHIRT_SIZE_OPTIONS = ['PP', 'P', 'M', 'G', 'GG', 'XG'] as const;

import { type CountryId, isValidCountryId, getDefaultLanguageForCountry } from '@/lib/countries';
import {
  type DocumentType,
  getDocumentHintKey,
  getDocumentTypesForCountry,
  sanitizeDocumentNumber,
  validateDocument,
} from '@/lib/document';
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
  documento?: string;
  documentType?: string;
  wantsToKnowNovoTempo?: boolean;
  institution: string;
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
    documentType: '' as DocumentType | '',
    documento: '',
    wantsToKnowNovoTempo: false,
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
        const types = getDocumentTypesForCountry(instCountry);
        setFormData((prev) => ({
          ...prev,
          phoneCountry: instCountry,
          documentType: types.length === 1 ? types[0] : '',
          documento: '',
        }));
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

    if (!formData.documentType) {
      newErrors.documentType = t.errors.requiredField;
    }
    if (!formData.documento.trim()) {
      newErrors.documento = t.errors.requiredField;
    } else if (
      !formData.phoneCountry ||
      !formData.documentType ||
      !validateDocument(formData.phoneCountry, formData.documentType, formData.documento).ok
    ) {
      newErrors.documento = t.errors.invalidDocumento;
    }
    if (!formData.shirtSize) {
      newErrors.shirtSize = t.errors.requiredField;
    } else if (!SHIRT_SIZE_OPTIONS.includes(formData.shirtSize as (typeof SHIRT_SIZE_OPTIONS)[number])) {
      newErrors.shirtSize = t.errors.requiredField;
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
          documentCountry: formData.phoneCountry,
          documentType: formData.documentType,
          documento: formData.documento,
          wantsToKnowNovoTempo: formData.wantsToKnowNovoTempo,
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: t.common.error,
          description:
            data.error === 'invalidDocumento'
              ? t.errors.invalidDocumento
              : data.error === 'documentalreadyregistered'
                ? t.errors.documentAlreadyRegistered
                : data.error || t.errors.registrationFailed,
        });
        return;
      }

      setSuccess({
        registrationCode: data.registrationCode,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        shirtSize: data.shirtSize,
        documento: data.documento,
        documentType: data.documentType,
        wantsToKnowNovoTempo: data.wantsToKnowNovoTempo,
        institution: data.institution,
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
                    {success.documento && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {success.documentType
                            ? t.publicInscription.documentTypeOptions[success.documentType] ??
                              t.publicInscription.documento
                            : t.publicInscription.documento}
                        </dt>
                        <dd className="font-semibold text-gray-900">{success.documento}</dd>
                      </div>
                    )}
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
                    {success.shirtSize && (
                      <div className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {t.publicInscription.shirtSize}
                        </dt>
                        <dd className="font-semibold text-gray-900">{success.shirtSize}</dd>
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
        <PublicPageHeader
          size="page"
          icon="heart"
          kicker={t.landing.heroTitle}
          title={t.publicInscription.title}
          subtitle={t.publicInscription.subtitle}
        />

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
                          onValueChange={(value) => {
                            const country = value as CountryId;
                            const types = getDocumentTypesForCountry(country);
                            setFormData({
                              ...formData,
                              phoneCountry: country,
                              phone: '',
                              documentType: types.length === 1 ? types[0] : '',
                              documento: '',
                            });
                          }}
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

                    <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
                      <div className="space-y-2 w-full sm:w-[30%] sm:shrink-0">
                        <Label className="text-sm sm:text-base font-semibold">
                          {t.publicInscription.documentType}
                        </Label>
                        <Select
                          value={formData.documentType || undefined}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              documentType: value as DocumentType,
                              documento: '',
                            })
                          }
                          disabled={!formData.phoneCountry}
                        >
                          <SelectTrigger
                            className={`h-12 min-h-[44px] ${errors.documentType ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                          >
                            <SelectValue placeholder={t.publicInscription.documentTypePlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {(formData.phoneCountry
                              ? getDocumentTypesForCountry(formData.phoneCountry)
                              : []
                            ).map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {t.publicInscription.documentTypeOptions[opt] ?? opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.documentType && (
                          <p className="text-sm text-red-600 mt-1 font-medium">{errors.documentType}</p>
                        )}
                      </div>

                      <div className="space-y-2 w-full sm:min-w-0 sm:flex-1">
                        <Label htmlFor="documento" className="text-sm sm:text-base font-semibold">
                          {t.publicInscription.documento}
                        </Label>
                        <Input
                          id="documento"
                          placeholder={t.publicInscription.documentoPlaceholder}
                          value={formData.documento}
                          disabled={!formData.phoneCountry || !formData.documentType}
                          onChange={(e) => {
                            if (!formData.phoneCountry || !formData.documentType) return;
                            setFormData({
                              ...formData,
                              documento: sanitizeDocumentNumber(
                                formData.phoneCountry,
                                formData.documentType,
                                e.target.value
                              ),
                            });
                          }}
                          className={`h-12 min-h-[44px] uppercase ${errors.documento ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        />
                        <p className="text-xs sm:text-sm text-gray-600">
                          {!formData.phoneCountry
                            ? t.publicInscription.documentoSelectCountryFirst
                            : t.publicInscription[getDocumentHintKey(formData.documentType)]}
                        </p>
                        {errors.documento && (
                          <p className="text-sm text-red-600 mt-1 font-medium">{errors.documento}</p>
                        )}
                      </div>
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
