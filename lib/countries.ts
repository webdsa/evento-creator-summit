/**
 * Lista de países usada na instituição (admin) e no formulário de inscrição (país do telefone).
 * Os IDs devem coincidir com o seletor de país/DDI na página de inscrição.
 */
export type CountryId = 'BR' | 'AR' | 'CL' | 'UY' | 'BO' | 'PY' | 'PE' | 'EC';

export const COUNTRY_OPTIONS: { id: CountryId; name: string }[] = [
  { id: 'BR', name: 'Brasil' },
  { id: 'AR', name: 'Argentina' },
  { id: 'CL', name: 'Chile' },
  { id: 'UY', name: 'Uruguai' },
  { id: 'BO', name: 'Bolívia' },
  { id: 'PY', name: 'Paraguai' },
  { id: 'PE', name: 'Peru' },
  { id: 'EC', name: 'Equador' },
];

const COUNTRY_IDS: CountryId[] = COUNTRY_OPTIONS.map((c) => c.id);

export function isValidCountryId(value: string | undefined | null): value is CountryId {
  return typeof value === 'string' && (COUNTRY_IDS as string[]).includes(value);
}

/** Idioma padrão por país: Brasil = pt-BR, demais = es */
export type DefaultLanguage = 'pt-BR' | 'es';

export function getDefaultLanguageForCountry(countryId: CountryId): DefaultLanguage {
  return countryId === 'BR' ? 'pt-BR' : 'es';
}
