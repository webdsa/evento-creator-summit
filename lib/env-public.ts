/**
 * Exibe workshops/plenárias na área pública (/, /workshops, /workshops/[id], seção de workshops na /consulta).
 * Definir NEXT_PUBLIC_SHOW_WORKSHOPS=false para ocultar. Se não definido ou diferente de "false", exibe.
 */
export const SHOW_WORKSHOPS_PUBLIC =
  typeof process.env.NEXT_PUBLIC_SHOW_WORKSHOPS === 'string'
    ? process.env.NEXT_PUBLIC_SHOW_WORKSHOPS.toLowerCase() !== 'false'
    : true;
