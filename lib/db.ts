/**
 * Firestore data access layer.
 * Replaces Supabase/PostgreSQL for: institutions, vouchers, registrations, admins.
 */

import * as admin from 'firebase-admin';
import { getAdminFirestore } from './firebase-admin';
import { coerceFirestoreInstantToIso } from './firestore-instant';

const COLL = {
  institutions: 'institutions',
  vouchers: 'vouchers',
  voucherCodes: 'voucher_codes',
  registrations: 'registrations',
  emailIndex: 'email_index',
  admins: 'admins',
  counters: 'counters',
  rooms: 'rooms',
  speakers: 'speakers',
  workshops: 'workshops',
} as const;

export type InstitutionStatus = 'active' | 'inactive';
/** Divisão administrativa das instituições (Grupo 1, 2 ou 3). */
export type InstitutionGroup = 1 | 2 | 3;
export type VoucherStatus = 'active' | 'paused';
export type RegistrationStatus = 'confirmed' | 'canceled';
export type Language = 'pt-BR' | 'es';

export interface Institution {
  id: string;
  name: string;
  /** Código do país (ex: BR, AR). Opcional; usado para pré-selecionar o país no formulário de inscrição. */
  country?: string;
  /** Grupo administrativo (1, 2 ou 3). Ausente em documentos antigos — tratar como 1 no admin. */
  group?: InstitutionGroup;
  quota_total: number;
  used_count: number;
  status: InstitutionStatus;
  created_at: string;
  updated_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  institution_id: string;
  quota_total: number;
  used_count: number;
  status: VoucherStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  registration_code: string;
  full_name: string;
  email: string;
  email_normalized: string;
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
  flight_return_time?: string;
  role?: string;
  institution_id: string;
  institution_name?: string;
  voucher_id: string;
  voucher_code: string;
  language: Language;
  status: RegistrationStatus;
  created_at: string;
  canceled_at: string | null;
  canceled_by: string | null;
  confirmation_email_sent_at: string | null;
  confirmation_email_last_error: string | null;
  /** Até 3 workshops que o inscrito escolheu (apenas status confirmed). @deprecated Use workshop_occurrence_keys. */
  workshop_ids?: string[];
  /** Chaves "workshopId:0", "workshopId:1", "workshopId:2" (até 3; uma por workshop). */
  workshop_occurrence_keys?: string[];
  /** Check-in no evento (timestamp ISO). */
  checked_in_at?: string | null;
}

function db() {
  return getAdminFirestore();
}

function now(): string {
  return new Date().toISOString();
}

function mapVoucherDoc(id: string, data: Record<string, unknown>): Voucher {
  return {
    ...(data as unknown as Omit<Voucher, 'id' | 'expires_at'>),
    id,
    expires_at: coerceFirestoreInstantToIso(data.expires_at),
  } as Voucher;
}

/** Grava `expires_at` como Timestamp (instante UTC correto no Console e nas queries). */
function voucherExpiresAtForFirestore(iso: string | null | undefined): admin.firestore.Timestamp | null {
  if (iso == null || iso === '') return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return admin.firestore.Timestamp.fromMillis(ms);
}

// --- Institutions ---
export async function listInstitutions(): Promise<Institution[]> {
  const snap = await db()
    .collection(COLL.institutions)
    .orderBy('created_at', 'desc')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Institution));
}

export async function getInstitution(id: string): Promise<Institution | null> {
  if (typeof id !== 'string' || !id.trim()) return null;
  const doc = await db().collection(COLL.institutions).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Institution;
}

/** Retorna apenas IDs válidos para document path (não vazios, string). */
function validDocIds(ids: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (typeof id === 'string' && id.trim().length > 0 && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

/** Busca várias instituições de uma vez (evita N+1). */
async function getInstitutionsByIds(ids: (string | undefined | null)[]): Promise<Map<string, Institution>> {
  const uniqueIds = validDocIds(ids);
  if (uniqueIds.length === 0) return new Map();
  const refs = uniqueIds.map((id) => db().collection(COLL.institutions).doc(id));
  const snaps = await db().getAll(...refs);
  const map = new Map<string, Institution>();
  snaps.forEach((snap, i) => {
    if (snap.exists && uniqueIds[i])
      map.set(uniqueIds[i], { id: snap.id, ...snap.data() } as Institution);
  });
  return map;
}

export async function createInstitution(data: {
  name: string;
  quota_total: number;
  status?: InstitutionStatus;
  country?: string;
  group?: InstitutionGroup;
}): Promise<Institution> {
  const ref = db().collection(COLL.institutions).doc();
  const t = now();
  const doc: Omit<Institution, 'id'> = {
    name: data.name,
    group: data.group ?? 1,
    quota_total: data.quota_total,
    used_count: 0,
    status: data.status ?? 'active',
    created_at: t,
    updated_at: t,
  };
  if (data.country !== undefined && data.country !== '') {
    doc.country = data.country;
  }
  await ref.set(doc);
  return { id: ref.id, ...doc };
}

export async function updateInstitution(
  id: string,
  data: Partial<Pick<Institution, 'name' | 'quota_total' | 'status' | 'country' | 'group'>>
): Promise<void> {
  const ref = db().collection(COLL.institutions).doc(id);
  await ref.update({ ...data, updated_at: now() });
}

export async function deleteInstitution(id: string): Promise<void> {
  await db().collection(COLL.institutions).doc(id).delete();
}

// --- Rooms (salas de palestras) ---
export interface Room {
  id: string;
  name: string;
  capacity: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

function roomFromDoc(id: string, data: Record<string, unknown>): Room {
  return {
    id,
    name: (data.name as string) ?? '',
    capacity: (data.capacity as number) ?? 0,
    enabled: (data.enabled as boolean) !== false,
    created_at: (data.created_at as string) ?? '',
    updated_at: (data.updated_at as string) ?? '',
  };
}

export async function listRooms(): Promise<Room[]> {
  const snap = await db()
    .collection(COLL.rooms)
    .orderBy('name', 'asc')
    .get();
  return snap.docs.map((d) => roomFromDoc(d.id, (d.data() as Record<string, unknown>) ?? {}));
}

export async function getRoom(id: string): Promise<Room | null> {
  if (typeof id !== 'string' || !id.trim()) return null;
  const doc = await db().collection(COLL.rooms).doc(id).get();
  if (!doc.exists) return null;
  return roomFromDoc(doc.id, (doc.data() as Record<string, unknown>) ?? {});
}

export async function createRoom(data: {
  name: string;
  capacity: number;
  enabled?: boolean;
}): Promise<Room> {
  const ref = db().collection(COLL.rooms).doc();
  const t = now();
  const doc: Omit<Room, 'id'> = {
    name: data.name.trim(),
    capacity: data.capacity,
    enabled: data.enabled !== false,
    created_at: t,
    updated_at: t,
  };
  await ref.set(doc);
  return { id: ref.id, ...doc };
}

export async function updateRoom(
  id: string,
  data: Partial<Pick<Room, 'name' | 'capacity' | 'enabled'>>
): Promise<void> {
  const ref = db().collection(COLL.rooms).doc(id);
  await ref.update({ ...data, updated_at: now() });
}

export async function deleteRoom(id: string): Promise<void> {
  await db().collection(COLL.rooms).doc(id).delete();
}

// --- Speakers (palestrantes) ---
export interface Speaker {
  id: string;
  name: string;
  biography: string;
  photo: string;
  created_at: string;
  updated_at: string;
}

function speakerFromDoc(id: string, data: Record<string, unknown>): Speaker {
  return {
    id,
    name: (data.name as string) ?? '',
    biography: (data.biography as string) ?? '',
    photo: (data.photo as string) ?? '',
    created_at: (data.created_at as string) ?? '',
    updated_at: (data.updated_at as string) ?? '',
  };
}

export async function listSpeakers(): Promise<Speaker[]> {
  const snap = await db()
    .collection(COLL.speakers)
    .orderBy('created_at', 'desc')
    .get();
  return snap.docs.map((d) =>
    speakerFromDoc(d.id, (d.data() as Record<string, unknown>) ?? {})
  );
}

export async function getSpeaker(id: string): Promise<Speaker | null> {
  if (typeof id !== 'string' || !id.trim()) return null;
  const doc = await db().collection(COLL.speakers).doc(id).get();
  if (!doc.exists) return null;
  return speakerFromDoc(doc.id, (doc.data() as Record<string, unknown>) ?? {});
}

/** Retorna palestrantes completos (id, name, biography, photo) por lista de ids. */
export async function getSpeakersByIds(ids: string[]): Promise<Speaker[]> {
  const unique = [...new Set(ids.filter((id) => typeof id === 'string' && id.trim()))];
  const result: Speaker[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const refs = chunk.map((id) => db().collection(COLL.speakers).doc(id));
    const snaps = await db().getAll(...refs);
    snaps.forEach((snap, idx) => {
      if (snap.exists && chunk[idx]) {
        result.push(
          speakerFromDoc(chunk[idx], (snap.data() as Record<string, unknown>) ?? {})
        );
      }
    });
  }
  return result;
}

export async function createSpeaker(data: {
  name: string;
  biography: string;
  photo?: string;
}): Promise<Speaker> {
  const ref = db().collection(COLL.speakers).doc();
  const t = now();
  const doc: Omit<Speaker, 'id'> = {
    name: data.name.trim(),
    biography: (data.biography ?? '').trim(),
    photo: (data.photo ?? '').trim(),
    created_at: t,
    updated_at: t,
  };
  await ref.set(doc);
  return { id: ref.id, ...doc };
}

export async function updateSpeaker(
  id: string,
  data: Partial<Pick<Speaker, 'name' | 'biography' | 'photo'>>
): Promise<void> {
  const ref = db().collection(COLL.speakers).doc(id);
  const updates: Record<string, unknown> = { ...data, updated_at: now() };
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.biography !== undefined) updates.biography = data.biography.trim();
  if (data.photo !== undefined) updates.photo = data.photo.trim();
  await ref.update(updates);
}

export async function deleteSpeaker(id: string): Promise<void> {
  await db().collection(COLL.speakers).doc(id).delete();
}

// --- Workshops ---
/** Cada workshop pode ter 3 ocorrências (sessões); cada uma com sua sala e vagas. */
export interface WorkshopOccurrence {
  room_id: string;
}

/** Tipo do item: workshop (3 seções, inscritos escolhem) ou plenária (apenas exibição). */
export type WorkshopType = 'workshop' | 'plenaria';

export interface Workshop {
  id: string;
  title: string;
  description: string;
  /** Tradução ES (opcional). */
  title_es?: string;
  description_es?: string;
  /** workshop = 3 seções, selecionável na consulta; plenaria = não selecionável. */
  type: WorkshopType;
  speaker_ids: string[];
  /** Sala da 1ª ocorrência; usado quando occurrences não existe (retrocompat). */
  room_id: string;
  /** 3 ocorrências, cada uma com room_id (vagas = capacidade da sala por ocorrência). */
  occurrences?: WorkshopOccurrence[];
  created_at: string;
  updated_at: string;
}

export type WorkshopWithSpeaker = Workshop & { speaker_names?: string; room_name?: string };

function workshopFromDoc(id: string, data: Record<string, unknown>): Workshop {
  const rawIds = data.speaker_ids ?? (data.speaker_id ? [data.speaker_id] : []);
  const ids = Array.isArray(rawIds)
    ? (rawIds as string[]).filter((x): x is string => typeof x === 'string')
    : [];
  const roomId = (data.room_id as string) ?? '';
  const rawOccurrences = data.occurrences;
  const occurrences: WorkshopOccurrence[] = Array.isArray(rawOccurrences) && rawOccurrences.length >= 3
    ? (rawOccurrences as { room_id?: string }[]).slice(0, 3).map((o) => ({
        room_id: typeof o?.room_id === 'string' ? o.room_id : roomId,
      }))
    : [
        { room_id: roomId },
        { room_id: roomId },
        { room_id: roomId },
      ];
  const type = (data.type as WorkshopType) === 'plenaria' ? 'plenaria' : 'workshop';
  return {
    id,
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    title_es: typeof data.title_es === 'string' ? data.title_es : undefined,
    description_es: typeof data.description_es === 'string' ? data.description_es : undefined,
    type,
    speaker_ids: ids,
    room_id: roomId,
    occurrences,
    created_at: (data.created_at as string) ?? '',
    updated_at: (data.updated_at as string) ?? '',
  };
}

/** Busca em lote até 100 documentos por vez (limite do Firestore getAll). */
async function getSpeakersBatch(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(ids.filter((id) => typeof id === 'string' && id.trim()))];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const refs = chunk.map((id) => db().collection(COLL.speakers).doc(id));
    const snaps = await db().getAll(...refs);
    snaps.forEach((snap, idx) => {
      if (snap.exists && chunk[idx]) {
        const data = snap.data() as { name?: string };
        map.set(chunk[idx], (data?.name as string) ?? '');
      }
    });
  }
  return map;
}

async function getRoomsBatch(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(ids.filter((id) => typeof id === 'string' && id.trim()))];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const refs = chunk.map((id) => db().collection(COLL.rooms).doc(id));
    const snaps = await db().getAll(...refs);
    snaps.forEach((snap, idx) => {
      if (snap.exists && chunk[idx]) {
        const data = snap.data() as { name?: string };
        map.set(chunk[idx], (data?.name as string) ?? '');
      }
    });
  }
  return map;
}

export async function listWorkshops(): Promise<WorkshopWithSpeaker[]> {
  const snap = await db()
    .collection(COLL.workshops)
    .orderBy('created_at', 'desc')
    .get();
  const list = snap.docs.map((d) =>
    workshopFromDoc(d.id, (d.data() as Record<string, unknown>) ?? {})
  );
  const uniqueSpeakerIds = list.flatMap((w) => w.speaker_ids).filter(Boolean);
  const uniqueRoomIds = list.map((w) => w.room_id).filter(Boolean);
  const [speakerMap, roomMap] = await Promise.all([
    getSpeakersBatch(uniqueSpeakerIds),
    getRoomsBatch(uniqueRoomIds),
  ]);
  return list.map((w) => ({
    ...w,
    speaker_names: w.speaker_ids.map((id) => speakerMap.get(id) ?? id).join(', ') || '',
    room_name: w.room_id ? roomMap.get(w.room_id) ?? '' : '',
  }));
}

export async function getWorkshop(id: string): Promise<Workshop | null> {
  if (typeof id !== 'string' || !id.trim()) return null;
  const doc = await db().collection(COLL.workshops).doc(id).get();
  if (!doc.exists) return null;
  return workshopFromDoc(doc.id, (doc.data() as Record<string, unknown>) ?? {});
}

export async function createWorkshop(data: {
  title: string;
  description: string;
  type?: WorkshopType;
  speaker_ids: string[];
  room_id: string;
  title_es?: string;
  description_es?: string;
}): Promise<Workshop> {
  const ref = db().collection(COLL.workshops).doc();
  const t = now();
  const ids = Array.isArray(data.speaker_ids)
    ? (data.speaker_ids as string[]).filter((x) => typeof x === 'string' && x.trim())
    : [];
  const roomId = typeof data.room_id === 'string' ? data.room_id.trim() : '';
  const type: WorkshopType = data.type === 'plenaria' ? 'plenaria' : 'workshop';
  const doc: Omit<Workshop, 'id'> = {
    title: data.title.trim(),
    description: (data.description ?? '').trim(),
    type,
    speaker_ids: ids,
    room_id: roomId,
    created_at: t,
    updated_at: t,
  };
  if (typeof data.title_es === 'string' && data.title_es.trim()) doc.title_es = data.title_es.trim();
  if (typeof data.description_es === 'string') doc.description_es = data.description_es.trim();
  await ref.set(doc);
  return { id: ref.id, ...doc };
}

export async function updateWorkshop(
  id: string,
  data: Partial<Pick<Workshop, 'title' | 'description' | 'type' | 'speaker_ids' | 'room_id' | 'title_es' | 'description_es'>>
): Promise<void> {
  const ref = db().collection(COLL.workshops).doc(id);
  const updates: Record<string, unknown> = { ...data, updated_at: now() };
  if (data.title !== undefined) updates.title = data.title.trim();
  if (data.description !== undefined) updates.description = data.description.trim();
  if (data.type !== undefined) updates.type = data.type === 'plenaria' ? 'plenaria' : 'workshop';
  if (data.speaker_ids !== undefined) {
    updates.speaker_ids = Array.isArray(data.speaker_ids)
      ? (data.speaker_ids as string[]).filter((x) => typeof x === 'string' && x.trim())
      : [];
  }
  if (data.room_id !== undefined) updates.room_id = typeof data.room_id === 'string' ? data.room_id.trim() : '';
  if (data.title_es !== undefined) updates.title_es = typeof data.title_es === 'string' ? data.title_es.trim() : '';
  if (data.description_es !== undefined) updates.description_es = typeof data.description_es === 'string' ? data.description_es.trim() : '';
  await ref.update(updates);
}

export async function deleteWorkshop(id: string): Promise<void> {
  await db().collection(COLL.workshops).doc(id).delete();
}

/** Conta quantos inscritos confirmados estão nesta ocorrência (workshop_occurrence_keys array-contains). */
export async function getWorkshopOccurrenceEnrollmentCount(occurrenceKey: string): Promise<number> {
  if (!occurrenceKey?.trim()) return 0;
  const snap = await db()
    .collection(COLL.registrations)
    .where('status', '==', 'confirmed')
    .where('workshop_occurrence_keys', 'array-contains', occurrenceKey)
    .get();
  return snap.size;
}

/** Chave de ocorrência: "workshopId:0" | "workshopId:1" | "workshopId:2". */
export function workshopOccurrenceKey(workshopId: string, occurrenceIndex: number): string {
  return `${workshopId}:${occurrenceIndex}`;
}

export type WorkshopWithVagas = WorkshopWithSpeaker & {
  /** Id único da opção = "workshopId:occurrenceIndex" (0, 1 ou 2). */
  occurrenceKey: string;
  occurrenceIndex: number;
  capacity: number;
  enrolledCount: number;
  vagasDisponiveis: number;
};

/** Lista workshops + plenárias para a página pública (listagem/detalhe). Sem consultas de vagas/inscritos. */
export async function listWorkshopsForListing(): Promise<WorkshopWithVagas[]> {
  const snap = await db()
    .collection(COLL.workshops)
    .orderBy('created_at', 'desc')
    .get();
  const list = snap.docs.map((d) =>
    workshopFromDoc(d.id, (d.data() as Record<string, unknown>) ?? {})
  );
  const uniqueSpeakerIds = list.flatMap((w) => w.speaker_ids).filter(Boolean);
  const uniqueRoomIds = [
    ...new Set([
      ...list.map((w) => w.room_id),
      ...list.flatMap((w) =>
        (w.occurrences ?? [{ room_id: w.room_id }, { room_id: w.room_id }, { room_id: w.room_id }])
          .slice(0, 3)
          .map((o) => o.room_id)
      ),
    ].filter(Boolean)),
  ];
  const [speakerMap, roomMap] = await Promise.all([
    getSpeakersBatch(uniqueSpeakerIds),
    getRoomsBatch(uniqueRoomIds),
  ]);
  const result: WorkshopWithVagas[] = [];
  for (const w of list) {
    const speaker_names = w.speaker_ids.map((id) => speakerMap.get(id) ?? id).join(', ') || '';
    const occs = w.occurrences ?? [
      { room_id: w.room_id },
      { room_id: w.room_id },
      { room_id: w.room_id },
    ];
    for (let idx = 0; idx < 3; idx++) {
      const o = occs[idx];
      const roomId = o?.room_id ?? w.room_id;
      result.push({
        ...w,
        speaker_names,
        room_name: roomId ? roomMap.get(roomId) ?? '' : '',
        occurrenceKey: workshopOccurrenceKey(w.id, idx),
        occurrenceIndex: idx,
        capacity: 0,
        enrolledCount: 0,
        vagasDisponiveis: 0,
      });
    }
  }
  return result;
}

/** Lista cada ocorrência (3 por workshop) com vagas disponíveis (para página de consulta).
 * Se forRegistration = true, retorna apenas itens do tipo "workshop" (plenárias não são selecionáveis). */
export async function listWorkshopsWithVagas(forRegistration = false): Promise<WorkshopWithVagas[]> {
  let list = await listWorkshops();
  if (forRegistration) list = list.filter((w) => w.type === 'workshop');
  const occurrences = list.flatMap((w) => {
    const occs = w.occurrences ?? [
      { room_id: w.room_id },
      { room_id: w.room_id },
      { room_id: w.room_id },
    ];
    return occs.slice(0, 3).map((o, idx) => ({ workshop: w, roomId: o.room_id, occurrenceIndex: idx }));
  });
  const resolved = await Promise.all(
    occurrences.map(async ({ workshop: w, roomId, occurrenceIndex }) => {
      const room = roomId ? await getRoom(roomId) : null;
      const capacity = room?.capacity ?? 0;
      const key = workshopOccurrenceKey(w.id, occurrenceIndex);
      const enrolledCount = await getWorkshopOccurrenceEnrollmentCount(key);
      return {
        workshop: w,
        occurrenceIndex,
        capacity,
        enrolledCount,
        vagasDisponiveis: Math.max(0, capacity - enrolledCount),
        occurrenceKey: key,
      };
    })
  );
  return resolved.map((r) => ({
    ...r.workshop,
    occurrenceKey: r.occurrenceKey,
    occurrenceIndex: r.occurrenceIndex,
    capacity: r.capacity,
    enrolledCount: r.enrolledCount,
    vagasDisponiveis: r.vagasDisponiveis,
  }));
}

// --- Vouchers & voucher_codes ---
export async function listVouchers(): Promise<(Voucher & { institution?: { name: string } })[]> {
  const snap = await db()
    .collection(COLL.vouchers)
    .orderBy('created_at', 'desc')
    .get();
  const vouchers = snap.docs.map((d) => mapVoucherDoc(d.id, d.data() as Record<string, unknown>));
  const institutionIds = vouchers.map((v) => v.institution_id);
  const instMap = await getInstitutionsByIds(institutionIds);
  return vouchers.map((v) => ({
    ...v,
    institution: instMap.get(v.institution_id) ? { name: instMap.get(v.institution_id)!.name } : undefined,
  }));
}

export async function getVoucherById(id: string): Promise<(Voucher & { institution?: Institution }) | null> {
  const doc = await db().collection(COLL.vouchers).doc(id).get();
  if (!doc.exists) return null;
  const v = mapVoucherDoc(doc.id, doc.data() as Record<string, unknown>);
  const inst = await getInstitution(v.institution_id);
  return { ...v, institution: inst ?? undefined };
}

export async function getVoucherByCode(code: string): Promise<(Voucher & { institution?: Institution }) | null> {
  const normalized = code.trim().toUpperCase();
  const codeDoc = await db().collection(COLL.voucherCodes).doc(normalized).get();
  if (!codeDoc.exists) return null;
  const voucherId = codeDoc.data()?.voucherId as string;
  return getVoucherById(voucherId);
}

/**
 * Soma as vagas restantes e conta quantos vouchers têm vagas na instituição.
 * Usado para exibir "Vagas restantes na instituição" e "Disponível em N vouchers" (admin).
 */
export async function getInstitutionRemainingFromVouchers(institutionId: string): Promise<{
  remaining: number;
  vouchersWithQuotaCount: number;
}> {
  const now = new Date();
  const snap = await db()
    .collection(COLL.vouchers)
    .where('institution_id', '==', institutionId)
    .where('status', '==', 'active')
    .get();
  let total = 0;
  let count = 0;
  snap.docs.forEach((d) => {
    const raw = d.data() as Record<string, unknown>;
    const exp = coerceFirestoreInstantToIso(raw.expires_at);
    if (exp && new Date(exp) < now) return;
    const quotaTotal = Number(raw.quota_total ?? 0);
    const usedCount = Number(raw.used_count ?? 0);
    const remaining = quotaTotal - usedCount;
    const value = Math.max(0, remaining);
    if (value > 0) count += 1;
    total += value;
  });
  return { remaining: total, vouchersWithQuotaCount: count };
}

export async function createVoucher(data: {
  code: string;
  institution_id: string;
  quota_total: number;
  status?: VoucherStatus;
  expires_at?: string | null;
}): Promise<Voucher> {
  const ref = db().collection(COLL.vouchers).doc();
  const t = now();
  const code = data.code.trim().toUpperCase();
  const expiresAtIso = data.expires_at ?? null;
  const payload = {
    code,
    institution_id: data.institution_id,
    quota_total: data.quota_total,
    used_count: 0,
    status: data.status ?? 'active',
    expires_at: voucherExpiresAtForFirestore(expiresAtIso),
    created_at: t,
    updated_at: t,
  };
  await db().runTransaction(async (tx) => {
    tx.set(ref, payload);
    tx.set(db().collection(COLL.voucherCodes).doc(code), { voucherId: ref.id, created_at: t });
  });
  return {
    id: ref.id,
    code,
    institution_id: data.institution_id,
    quota_total: data.quota_total,
    used_count: 0,
    status: data.status ?? 'active',
    expires_at: expiresAtIso,
    created_at: t,
    updated_at: t,
  };
}

export async function updateVoucher(
  id: string,
  data: Partial<Pick<Voucher, 'code' | 'quota_total' | 'status' | 'expires_at'>>
): Promise<void> {
  const ref = db().collection(COLL.vouchers).doc(id);
  const current = (await ref.get()).data() as Voucher | undefined;
  const t = now();
  const updates: Record<string, unknown> = { ...data, updated_at: t };
  if (data.expires_at !== undefined) {
    updates.expires_at = voucherExpiresAtForFirestore(data.expires_at ?? null);
  }
  if (data.code !== undefined) {
    const newCode = data.code.trim().toUpperCase();
    const codeRef = db().collection(COLL.voucherCodes).doc(newCode);
    const oldCode = current?.code;
    await db().runTransaction(async (tx) => {
      tx.update(ref, updates);
      if (oldCode && oldCode !== newCode) tx.delete(db().collection(COLL.voucherCodes).doc(oldCode));
      tx.set(codeRef, { voucherId: id, created_at: t });
    });
  } else {
    await ref.update(updates);
  }
}

export async function deleteVoucher(id: string): Promise<void> {
  const doc = await db().collection(COLL.vouchers).doc(id).get();
  const code = (doc.data() as Voucher)?.code;
  await db().runTransaction(async (tx) => {
    tx.delete(db().collection(COLL.vouchers).doc(id));
    if (code) tx.delete(db().collection(COLL.voucherCodes).doc(code));
  });
}

// Caracteres para código aleatório (evita 0/O, 1/I/L para legibilidade)
const REG_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const REG_CODE_LENGTH = 5;
const REG_CODE_MAX_RETRIES = 15;

function generateRandomCode(): string {
  let code = '';
  for (let i = 0; i < REG_CODE_LENGTH; i++) {
    code += REG_CODE_CHARS[Math.floor(Math.random() * REG_CODE_CHARS.length)];
  }
  return code;
}

async function getUniqueRegistrationCode(): Promise<string> {
  for (let attempt = 0; attempt < REG_CODE_MAX_RETRIES; attempt++) {
    const code = generateRandomCode();
    const snap = await db()
      .collection(COLL.registrations)
      .where('registration_code', '==', code)
      .limit(1)
      .get();
    if (snap.empty) return code;
  }
  throw new Error('Não foi possível gerar código de inscrição único. Tente novamente.');
}

export async function findConfirmedRegistrationByDocument(
  country: string,
  type: string,
  documento: string
): Promise<Registration | null> {
  const value = documento.trim().toUpperCase();
  if (!country || !type || !value) return null;
  const snap = await db().collection(COLL.registrations).where('documento', '==', value).limit(20).get();
  const match = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Registration))
    .find(
      (reg) =>
        reg.status === 'confirmed' &&
        reg.document_country === country &&
        reg.document_type === type
    );
  return match ?? null;
}

// --- Registrations (create_registration logic) ---
export type CreateRegistrationResult =
  | { success: true; registration_id: string; registration_code: string }
  | { success: false; error: string };

export async function createRegistration(params: {
  p_voucher_code: string;
  p_full_name: string;
  p_email: string;
  p_phone: string;
  p_gender: string;
  p_shirt_size: string;
  p_campo?: string;
  p_plataforma?: string;
  p_seguidores?: number;
  p_documento: string;
  p_document_country: string;
  p_document_type: string;
  p_conteudo?: string;
  p_link_or_handle?: string;
  p_wants_to_know_novo_tempo: boolean;
  p_flight_departure_time?: string;
  p_flight_return_time?: string;
  p_role?: string;
  p_language: string;
}): Promise<CreateRegistrationResult> {
  const {
    p_voucher_code,
    p_full_name,
    p_email,
    p_phone,
    p_gender,
    p_shirt_size,
    p_campo,
    p_plataforma,
    p_seguidores,
    p_documento,
    p_document_country,
    p_document_type,
    p_conteudo,
    p_link_or_handle,
    p_wants_to_know_novo_tempo,
    p_flight_departure_time,
    p_flight_return_time,
    p_role,
    p_language,
  } = params;
  if (p_language !== 'pt-BR' && p_language !== 'es') {
    return { success: false, error: 'INVALID_LANGUAGE' };
  }
  const emailNormalized = p_email.trim().toLowerCase();

  const voucher = await getVoucherByCode(p_voucher_code);
  if (!voucher) return { success: false, error: 'VOUCHER_NOT_FOUND' };
  if (voucher.status !== 'active') return { success: false, error: 'VOUCHER_INACTIVE' };
  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
    return { success: false, error: 'VOUCHER_EXPIRED' };
  }
  if (voucher.used_count >= voucher.quota_total) return { success: false, error: 'VOUCHER_NO_QUOTA' };

  const institution = voucher.institution;
  if (!institution) return { success: false, error: 'INSTITUTION_NOT_FOUND' };
  if (institution.status !== 'active') return { success: false, error: 'INSTITUTION_INACTIVE' };
  if (institution.used_count >= institution.quota_total) return { success: false, error: 'INSTITUTION_NO_QUOTA' };

  const emailIndexDoc = await db().collection(COLL.emailIndex).doc(emailNormalized).get();
  if (emailIndexDoc.exists) return { success: false, error: 'EMAIL_ALREADY_REGISTERED' };

  const existingDocument = await findConfirmedRegistrationByDocument(
    p_document_country,
    p_document_type,
    p_documento
  );
  if (existingDocument) return { success: false, error: 'DOCUMENT_ALREADY_REGISTERED' };

  const registrationCode = await getUniqueRegistrationCode();
  const voucherCode = p_voucher_code.trim().toUpperCase();
  const regRef = db().collection(COLL.registrations).doc();
  const t = now();

  const registration: Omit<Registration, 'id'> = {
    registration_code: registrationCode,
    full_name: p_full_name,
    email: p_email,
    email_normalized: emailNormalized,
    phone: p_phone,
    gender: p_gender || undefined,
    shirt_size: p_shirt_size || undefined,
    campo: p_campo || undefined,
    plataforma: p_plataforma || undefined,
    seguidores: p_seguidores !== undefined && Number.isFinite(p_seguidores) ? p_seguidores : undefined,
    documento: p_documento || undefined,
    document_country: p_document_country || undefined,
    document_type: p_document_type || undefined,
    conteudo: p_conteudo || undefined,
    link_or_handle: p_link_or_handle || undefined,
    wants_to_know_novo_tempo: p_wants_to_know_novo_tempo,
    flight_departure_time: p_flight_departure_time || undefined,
    flight_return_time: p_flight_return_time || undefined,
    role: p_role || undefined,
    institution_id: voucher.institution_id,
    institution_name: institution?.name,
    voucher_id: voucher.id,
    voucher_code: voucherCode,
    language: p_language as Language,
    status: 'confirmed',
    created_at: t,
    canceled_at: null,
    canceled_by: null,
    confirmation_email_sent_at: null,
    confirmation_email_last_error: null,
  };

  const registrationDoc = Object.fromEntries(
    Object.entries(registration).filter(([, value]) => value !== undefined)
  );

  const voucherRef = db().collection(COLL.vouchers).doc(voucher.id);
  const institutionRef = db().collection(COLL.institutions).doc(voucher.institution_id);
  const emailIndexRef = db().collection(COLL.emailIndex).doc(emailNormalized);

  await db().runTransaction(async (tx) => {
    tx.set(regRef, registrationDoc);
    tx.set(emailIndexRef, { registrationId: regRef.id, created_at: t });
    tx.update(voucherRef, { used_count: (voucher.used_count ?? 0) + 1, updated_at: t });
    tx.update(institutionRef, { used_count: institution.used_count + 1, updated_at: t });
  });

  return {
    success: true,
    registration_id: regRef.id,
    registration_code: registrationCode,
  };
}

// --- Cancel registration ---
export type CancelRegistrationResult = { success: true } | { success: false; error: string };

export async function cancelRegistration(
  p_registration_id: string,
  p_canceled_by: string
): Promise<CancelRegistrationResult> {
  const regRef = db().collection(COLL.registrations).doc(p_registration_id);
  const regSnap = await regRef.get();
  if (!regSnap.exists) return { success: false, error: 'REGISTRATION_NOT_FOUND' };
  const reg = { id: regSnap.id, ...regSnap.data() } as Registration;
  if (reg.status === 'canceled') return { success: true };

  const t = now();
  const voucherRef = db().collection(COLL.vouchers).doc(reg.voucher_id);
  const institutionRef = db().collection(COLL.institutions).doc(reg.institution_id);

  await db().runTransaction(async (tx) => {
    const vSnap = await tx.get(voucherRef);
    const iSnap = await tx.get(institutionRef);
    const vUsed = (vSnap.data()?.used_count ?? 0) - 1;
    const iUsed = (iSnap.data()?.used_count ?? 0) - 1;
    tx.update(regRef, {
      status: 'canceled',
      canceled_at: t,
      canceled_by: p_canceled_by,
    });
    tx.update(voucherRef, { used_count: Math.max(0, vUsed), updated_at: t });
    tx.update(institutionRef, { used_count: Math.max(0, iUsed), updated_at: t });
  });

  return { success: true };
}

// --- Reactivate registration ---
export type ReactivateRegistrationResult = { success: true } | { success: false; error: string };

export async function reactivateRegistration(
  p_registration_id: string
): Promise<ReactivateRegistrationResult> {
  const regRef = db().collection(COLL.registrations).doc(p_registration_id);
  const regSnap = await regRef.get();
  if (!regSnap.exists) return { success: false, error: 'REGISTRATION_NOT_FOUND' };
  const reg = { id: regSnap.id, ...regSnap.data() } as Registration;
  if (reg.status === 'confirmed') return { success: true };

  const voucherRef = db().collection(COLL.vouchers).doc(reg.voucher_id);
  const institutionRef = db().collection(COLL.institutions).doc(reg.institution_id);
  const voucherSnap = await voucherRef.get();
  const institutionSnap = await institutionRef.get();
  const voucher = voucherSnap.exists ? (voucherSnap.data() as Voucher) : null;
  const institution = institutionSnap.exists ? (institutionSnap.data() as Institution) : null;
  if (!voucher || !institution) return { success: false, error: 'VOUCHER_OR_INSTITUTION_NOT_FOUND' };
  if (voucher.status !== 'active') return { success: false, error: 'VOUCHER_INACTIVE' };
  if (voucher.used_count >= voucher.quota_total) return { success: false, error: 'VOUCHER_NO_QUOTA' };
  if (institution.status !== 'active') return { success: false, error: 'INSTITUTION_INACTIVE' };
  if (institution.used_count >= institution.quota_total) return { success: false, error: 'INSTITUTION_NO_QUOTA' };

  const t = now();
  await db().runTransaction(async (tx) => {
    const vSnap = await tx.get(voucherRef);
    const iSnap = await tx.get(institutionRef);
    const vUsed = (vSnap.data()?.used_count ?? 0) + 1;
    const iUsed = (iSnap.data()?.used_count ?? 0) + 1;
    tx.update(regRef, {
      status: 'confirmed',
      canceled_at: null,
      canceled_by: null,
    });
    tx.update(voucherRef, { used_count: vUsed, updated_at: t });
    tx.update(institutionRef, { used_count: iUsed, updated_at: t });
  });

  return { success: true };
}

// --- Delete registration ---
export type DeleteRegistrationResult = { success: true } | { success: false; error: string };

export async function deleteRegistration(p_registration_id: string): Promise<DeleteRegistrationResult> {
  const regRef = db().collection(COLL.registrations).doc(p_registration_id);
  const regSnap = await regRef.get();
  if (!regSnap.exists) return { success: false, error: 'REGISTRATION_NOT_FOUND' };
  const reg = { id: regSnap.id, ...regSnap.data() } as Registration;

  const t = now();
  const voucherRef = db().collection(COLL.vouchers).doc(reg.voucher_id);
  const institutionRef = db().collection(COLL.institutions).doc(reg.institution_id);
  const emailIndexRef = db().collection(COLL.emailIndex).doc(reg.email_normalized);

  await db().runTransaction(async (tx) => {
    const vSnap = await tx.get(voucherRef);
    const iSnap = await tx.get(institutionRef);
    const vUsed = (vSnap.data()?.used_count ?? 0) - (reg.status === 'confirmed' ? 1 : 0);
    const iUsed = (iSnap.data()?.used_count ?? 0) - (reg.status === 'confirmed' ? 1 : 0);
    tx.delete(regRef);
    tx.delete(emailIndexRef);
    tx.update(voucherRef, { used_count: Math.max(0, vUsed), updated_at: t });
    tx.update(institutionRef, { used_count: Math.max(0, iUsed), updated_at: t });
  });

  return { success: true };
}

// --- List registrations ---
export async function listRegistrations(): Promise<(Registration & { institution?: { name: string } })[]> {
  const snap = await db()
    .collection(COLL.registrations)
    .orderBy('created_at', 'desc')
    .get();
  const list = snap.docs
    .filter((d) => d.id !== '_init')
    .map((d) => {
      const raw = d.data() as Record<string, unknown>;
      const reg = { id: d.id, ...raw } as Registration;
      return { ...reg, checked_in_at: coerceFirestoreInstantToIso(raw.checked_in_at) };
    });
  const institutionIds = list.map((r) => r.institution_id);
  const instMap = await getInstitutionsByIds(institutionIds);
  return list.map((r) => ({
    ...r,
    institution: instMap.get(r.institution_id) ? { name: instMap.get(r.institution_id)!.name } : undefined,
  }));
}

export async function getRegistrationById(
  id: string
): Promise<
  (Registration & { institution?: { name: string; group: InstitutionGroup } }) | null
> {
  const doc = await db().collection(COLL.registrations).doc(id).get();
  if (!doc.exists) return null;
  const raw = doc.data() as Record<string, unknown>;
  const r = { id: doc.id, ...raw, checked_in_at: coerceFirestoreInstantToIso(raw.checked_in_at) } as Registration;
  const inst = await getInstitution(r.institution_id);
  if (!inst) return { ...r, institution: undefined };
  const group: InstitutionGroup =
    inst.group === 1 || inst.group === 2 || inst.group === 3 ? inst.group : 1;
  return { ...r, institution: { name: inst.name, group } };
}

/** Busca inscrição por código e e-mail (para consulta pública de status). */
export async function getRegistrationByCodeAndEmail(
  registrationCode: string,
  email: string
): Promise<
  (Registration & { institution?: { name: string; group: InstitutionGroup } }) | null
> {
  const code = registrationCode.trim().toUpperCase();
  const emailNormalized = email.trim().toLowerCase();
  if (!code || !emailNormalized) return null;
  const snap = await db()
    .collection(COLL.registrations)
    .where('registration_code', '==', code)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const raw = doc.data() as Record<string, unknown>;
  const r = { id: doc.id, ...raw, checked_in_at: coerceFirestoreInstantToIso(raw.checked_in_at) } as Registration;
  if (r.email_normalized !== emailNormalized) return null;
  const inst = await getInstitution(r.institution_id);
  if (!inst) return { ...r, institution: undefined };
  const group: InstitutionGroup =
    inst.group === 1 || inst.group === 2 || inst.group === 3 ? inst.group : 1;
  return { ...r, institution: { name: inst.name, group } };
}

/** Busca inscrição apenas por código (para check-in do organizador). Retorna dados mínimos. */
export async function getRegistrationByCodeForCheckin(
  registrationCode: string
): Promise<
  | { id: string; registration_code: string; full_name: string; status: string; checked_in_at: string | null }
  | null
> {
  const code = registrationCode.trim().toUpperCase();
  if (!code) return null;
  const snap = await db()
    .collection(COLL.registrations)
    .where('registration_code', '==', code)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const d = doc.data();
  return {
    id: doc.id,
    registration_code: (d?.registration_code as string) ?? code,
    full_name: (d?.full_name as string) ?? '',
    status: (d?.status as string) ?? 'confirmed',
    checked_in_at: coerceFirestoreInstantToIso(d?.checked_in_at),
  };
}

/** Grava instante do check-in como Timestamp e devolve o mesmo momento em ISO UTC (alinhado à API/UI). */
export async function setRegistrationCheckedIn(registrationId: string): Promise<string> {
  const ms = Date.now();
  const ts = admin.firestore.Timestamp.fromMillis(ms);
  await db().collection(COLL.registrations).doc(registrationId).update({ checked_in_at: ts });
  return new Date(ms).toISOString();
}

export type UpdateRegistrationData = Partial<
  Pick<
    Registration,
    | 'full_name'
    | 'email'
    | 'email_normalized'
    | 'phone'
    | 'gender'
    | 'shirt_size'
    | 'campo'
    | 'plataforma'
    | 'seguidores'
    | 'documento'
    | 'document_country'
    | 'document_type'
    | 'conteudo'
    | 'link_or_handle'
    | 'wants_to_know_novo_tempo'
    | 'flight_departure_time'
    | 'flight_return_time'
    | 'role'
    | 'language'
    | 'confirmation_email_sent_at'
    | 'confirmation_email_last_error'
    | 'workshop_ids'
    | 'workshop_occurrence_keys'
    | 'checked_in_at'
  >
>;

export async function updateRegistration(
  id: string,
  data: UpdateRegistrationData
): Promise<void> {
  await db().collection(COLL.registrations).doc(id).update(data);
}

// --- Admins ---
export type AdminRole = 'admin' | 'checkin';

export async function isAdminUser(userId: string): Promise<boolean> {
  const admin = await getAdmin(userId);
  return admin?.enabled === true && (admin.role ?? 'admin') === 'admin';
}

/** Usuário pode fazer check-in (admin ou role checkin). */
export async function canDoCheckin(userId: string): Promise<boolean> {
  const admin = await getAdmin(userId);
  if (!admin?.enabled) return false;
  const role = admin.role ?? 'admin';
  return role === 'admin' || role === 'checkin';
}

export async function getAdmin(
  userId: string
): Promise<{ enabled: boolean; hasChangedPassword: boolean; role: AdminRole } | null> {
  const doc = await db().collection(COLL.admins).doc(userId).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  const role = (d.role === 'checkin' ? 'checkin' : 'admin') as AdminRole;
  return {
    enabled: d.enabled,
    hasChangedPassword: !!d.passwordChangedAt,
    role,
  };
}

export async function createAdminUser(params: {
  uid: string;
  role: AdminRole;
}): Promise<void> {
  const t = now();
  await db()
    .collection(COLL.admins)
    .doc(params.uid)
    .set(
      {
        enabled: true,
        role: params.role,
        created_at: t,
      },
      { merge: true }
    );
}

export async function setAdminPasswordChanged(userId: string): Promise<void> {
  const { FieldValue } = await import('firebase-admin/firestore');
  await db().collection(COLL.admins).doc(userId).update({
    passwordChangedAt: FieldValue.serverTimestamp(),
  });
}

export interface AdminListEntry {
  uid: string;
  role: AdminRole;
  enabled: boolean;
  created_at: string | null;
  hasChangedPassword: boolean;
}

/** Lista todos os documentos da coleção admins (para listagem na tela de usuários). */
export async function listAdminDocuments(): Promise<AdminListEntry[]> {
  const snap = await db().collection(COLL.admins).get();
  return snap.docs
    .filter((d) => d.id !== '_init')
    .map((d) => {
      const data = d.data();
      const role = (data.role === 'checkin' ? 'checkin' : 'admin') as AdminRole;
      return {
        uid: d.id,
        role,
        enabled: !!data.enabled,
        created_at: data.created_at ?? null,
        hasChangedPassword: !!data.passwordChangedAt,
      };
    });
}
