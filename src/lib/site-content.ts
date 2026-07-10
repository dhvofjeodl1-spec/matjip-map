import { supabase, isSupabaseConfigured } from './supabase';

export interface SiteContentRecord {
  id?: string;
  content_key: string;
  title: string;
  content: Record<string, unknown>;
  is_active: boolean;
  updated_at?: string | null;
  updated_by?: string | null;
}

export interface SiteContentInput {
  title: string;
  content: Record<string, unknown>;
  isActive: boolean;
  updatedBy?: string | null;
}

const STORAGE_PREFIX = 'matjido-site-content';

const DEFAULT_CONTENTS: Record<string, SiteContentRecord> = {
  notice: {
    content_key: 'notice',
    title: '📢 공지사항',
    content: {
      title: '📢 공지사항',
      body: '맛지도 베타 서비스입니다.\n\n등록된 맛집은 관리자 승인 후 공개됩니다.\n\n잘못된 정보는 신고 기능을 이용해주세요.',
    },
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  about: {
    content_key: 'about',
    title: '맛지도 소개',
    content: {
      pageTitle: '맛지도 소개',
      intro: '맛지도는 지도에서 맛집을 발견하고, 직접 등록하며, 신뢰할 수 있는 정보를 공유하는 서비스입니다.',
      registrationMethod: '지도에서 원하는 위치를 선택하고 맛집 정보를 입력하면 관리자의 승인 후 공개됩니다.',
      approvalSystem: '등록된 맛집은 관리자 승인 후 지도에 노출되어 더 신뢰성 있는 정보를 제공합니다.',
      operatingPrinciples: '정확한 정보와 안전한 이용을 위해 잘못된 정보는 신고 기능으로 알려주세요.',
      faq: '로그인 없이도 둘러볼 수 있지만, 등록·신고 기능은 로그인 후 이용할 수 있습니다.',
    },
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  contact: {
    content_key: 'contact',
    title: '문의하기',
    content: {
      pageTitle: '맛지도 문의',
      inquiryGuide: '서비스 이용 관련 문의를 남겨주세요.',
      bugReportGuide: '지도 오류나 화면 문제를 알려주세요.',
      deletionRequestGuide: '부적절한 정보나 잘못된 맛집 등록을 요청하세요.',
      serviceSuggestionGuide: '새 기능이나 개선 아이디어를 공유해주세요.',
      contactEmailOrUrl: 'mailto:dhvofjeodl1@gmail.com',
    },
    is_active: true,
    updated_at: new Date().toISOString(),
  },
};

function fallbackSiteContent(contentKey: string): SiteContentRecord {
  return {
    ...DEFAULT_CONTENTS[contentKey],
    content_key: contentKey,
    title: DEFAULT_CONTENTS[contentKey]?.title ?? '',
    content: DEFAULT_CONTENTS[contentKey]?.content ?? {},
    is_active: DEFAULT_CONTENTS[contentKey]?.is_active ?? true,
    updated_at: DEFAULT_CONTENTS[contentKey]?.updated_at ?? new Date().toISOString(),
  };
}

function storageKey(contentKey: string) {
  return `${STORAGE_PREFIX}:${contentKey}`;
}

function readStoredRecord(contentKey: string): SiteContentRecord | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(storageKey(contentKey));
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as SiteContentRecord;
  } catch {
    return null;
  }
}

function writeStoredRecord(contentKey: string, record: SiteContentRecord) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey(contentKey), JSON.stringify(record));
  } catch {
    // ignore storage errors
  }
}

export async function fetchSiteContent(contentKey: string): Promise<SiteContentRecord> {
  const fallback = fallbackSiteContent(contentKey);
  const stored = readStoredRecord(contentKey);
  if (stored) {
    return stored;
  }

  if (!isSupabaseConfigured || !supabase) {
    return fallback;
  }

  const { data, error } = await supabase.from('site_content').select('*').eq('content_key', contentKey).maybeSingle();
  if (error || !data) {
    return fallback;
  }

  const normalized: SiteContentRecord = {
    id: data.id,
    content_key: data.content_key,
    title: data.title ?? fallback.title,
    content: typeof data.content === 'object' && data.content !== null ? (data.content as Record<string, unknown>) : {},
    is_active: Boolean(data.is_active),
    updated_at: data.updated_at,
    updated_by: data.updated_by,
  };

  writeStoredRecord(contentKey, normalized);
  return normalized;
}

export async function saveSiteContent(contentKey: string, input: SiteContentInput, updatedBy?: string | null): Promise<SiteContentRecord> {
  const fallback = fallbackSiteContent(contentKey);
  const payload: SiteContentRecord = {
    content_key: contentKey,
    title: input.title || fallback.title,
    content: input.content ?? {},
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy ?? null,
  };

  if (!isSupabaseConfigured || !supabase) {
    writeStoredRecord(contentKey, payload);
    return payload;
  }

  const { data, error } = await supabase
    .from('site_content')
    .upsert(
      {
        content_key: contentKey,
        title: payload.title,
        content: payload.content,
        is_active: payload.is_active,
        updated_at: payload.updated_at,
        updated_by: payload.updated_by,
      },
      { onConflict: 'content_key' },
    )
    .select('*')
    .single();

  if (error || !data) {
    writeStoredRecord(contentKey, payload);
    return payload;
  }

  const normalized: SiteContentRecord = {
    id: data.id,
    content_key: data.content_key,
    title: data.title ?? payload.title,
    content: typeof data.content === 'object' && data.content !== null ? (data.content as Record<string, unknown>) : payload.content,
    is_active: Boolean(data.is_active),
    updated_at: data.updated_at,
    updated_by: data.updated_by,
  };

  writeStoredRecord(contentKey, normalized);
  return normalized;
}
