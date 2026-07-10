// 데이터 접근 레이어
//
// Supabase가 설정되어 있으면 "restaurants" 테이블에서 데이터를 읽고 씁니다.
// 설정되어 있지 않으면(VITE_SUPABASE_* 환경변수 미설정) 목업 데이터를 그대로 반환합니다.
// Home.tsx 등 화면 코드는 이 함수들만 호출하므로, 테이블 스키마가 바뀌어도
// 나머지 UI 코드는 수정할 필요가 없습니다.

import { supabase, isSupabaseConfigured, isAdminEmail } from './supabase';
import { MOCK_RESTAURANTS, Restaurant, Category } from './mock-data';

const TABLE_NAME = 'restaurants';

const DEFAULT_IMAGE_URL =
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop';

/** 사용자가 등록 폼에 입력하는 값 */
export interface NewRestaurantInput {
  name: string;
  address: string;
  category: Category;
  menuName: string;
  price: number;
  shortReview: string;
  lat: number;
  lng: number;
  phone?: string;
  blogReviewUrl?: string;
  imageUrl?: string;
  rating?: number;
  ownerId?: string;
  isApproved?: boolean;
}

export interface RestaurantUpdateInput {
  id: string;
  name: string;
  address: string;
  category: Category;
  menuName: string;
  price: number;
  shortReview: string;
  lat: number;
  lng: number;
  phone?: string;
  blogReviewUrl?: string;
  imageUrl?: string;
  rating?: number;
}

function rowToRestaurant(row: Record<string, any>): Restaurant {
  const ratingValue = typeof row.rating === 'number' ? row.rating : Number(row.rating) || 0;
  return {
    id: String(row.id),
    name: row.name ?? '이름 없음',
    category: (row.category as Category) ?? '기타',
    rating: ratingValue,
    reviewCount: typeof row.review_count === 'number' ? row.review_count : 0,
    shortReview: row.short_review ?? '',
    isOpen: row.is_open ?? true,
    imageUrl: row.image_url ? String(row.image_url) : DEFAULT_IMAGE_URL,
    address: row.address ?? '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    menu: Array.isArray(row.menu) ? row.menu : [],
    lat: typeof row.lat === 'number' ? row.lat : 0,
    lng: typeof row.lng === 'number' ? row.lng : 0,
    phone: row.phone ? String(row.phone) : undefined,
    isApproved: row.is_approved === undefined ? true : Boolean(row.is_approved),
    ownerId: row.owner_id ?? undefined,
    ownerEmail: row.owner_email ?? undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    blogReviewUrl: row.blog_review_url || undefined,
  };
}

/**
 * 식당 목록을 불러옵니다.
 * - Supabase 미설정: 목업 데이터 반환
 * - Supabase 설정됨: "restaurants" 테이블 데이터 반환 (실패 시 목업 데이터로 대체)
 */
export async function fetchAllRestaurants(user?: { id?: string | null; email?: string | null }): Promise<Restaurant[]> {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_RESTAURANTS;
  }

  try {
    const query = supabase.from(TABLE_NAME).select('*');

    if (!isAdminEmail(user?.email)) {
      query.eq('is_approved', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(rowToRestaurant);
  } catch (error) {
    console.error('[맛지도] Supabase에서 식당 목록을 불러오지 못했습니다. 목업 데이터로 대체합니다.', error);
    return MOCK_RESTAURANTS;
  }
}

/**
 * 새 식당을 Supabase "restaurants" 테이블에 등록합니다.
 * Supabase가 설정되지 않은 경우 에러를 던지므로, 호출부에서 안내 메시지를 보여주세요.
 */
export async function addRestaurant(input: NewRestaurantInput): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase가 설정되지 않아 등록할 수 없습니다.');
  }

  if (!input.ownerId) {
    throw new Error('로그인 후 맛집을 등록할 수 있습니다.');
  }

  const insertPayload: Record<string, unknown> = {
    name: input.name,
    address: input.address,
    category: input.category,
    menu: [{ name: input.menuName, price: input.price }],
    short_review: input.shortReview,
    lat: Number(input.lat),
    lng: Number(input.lng),
    rating: input.rating ?? 0,
    review_count: 0,
    is_open: true,
    image_url: input.imageUrl?.trim() || DEFAULT_IMAGE_URL,
    blog_review_url: input.blogReviewUrl?.trim() || null,
    is_approved: input.isApproved === true,
    owner_id: input.ownerId,
    tags: [],
  };

  if (input.phone?.trim()) {
    insertPayload.phone = input.phone.trim();
  }

  const tryInsert = async (payload: Record<string, unknown>) => {
    return supabase.from(TABLE_NAME).insert(payload).select('id').single();
  };

  let data;
  let error = null;

  ({ data, error } = await tryInsert(insertPayload));

  if (error) {
    const message = error.message || '';
    if (/column .* does not exist|does not exist/i.test(message)) {
      const fallbackPayload = { ...insertPayload };
      delete fallbackPayload.phone;
      ({ data, error } = await tryInsert(fallbackPayload));
    }
  }

  if (error) throw error;
  if (!data?.id) throw new Error('등록된 식당의 ID를 확인하지 못했습니다.');

  return String(data.id);
}

export async function updateRestaurant(input: RestaurantUpdateInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase가 설정되지 않아 수정할 수 없습니다.');
  }

  const updatePayload: Record<string, unknown> = {
    name: input.name,
    address: input.address,
    category: input.category,
    menu: [{ name: input.menuName, price: input.price }],
    short_review: input.shortReview,
    lat: Number(input.lat),
    lng: Number(input.lng),
    rating: input.rating ?? 0,
    image_url: input.imageUrl?.trim() || null,
    blog_review_url: input.blogReviewUrl?.trim() || null,
  };

  if (input.phone?.trim()) {
    updatePayload.phone = input.phone.trim();
  }

  const tryUpdate = async (payload: Record<string, unknown>) => {
    return supabase.from(TABLE_NAME).update(payload).eq('id', input.id);
  };

  let result = await tryUpdate(updatePayload);

  if (result.error) {
    const message = result.error.message || '';
    if (/column .* does not exist|does not exist/i.test(message)) {
      const fallbackPayload = { ...updatePayload };
      delete fallbackPayload.phone;
      result = await tryUpdate(fallbackPayload);
    }
  }

  if (result.error) throw result.error;
}

export async function approveRestaurant(restaurantId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase가 설정되지 않아 승인할 수 없습니다.');
  }

  const { error } = await supabase.from(TABLE_NAME).update({ is_approved: true }).eq('id', restaurantId);
  if (error) throw error;
}

export async function setRestaurantApprovalStatus(restaurantId: string, isApproved: boolean): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase가 설정되지 않아 승인 상태를 변경할 수 없습니다.');
  }

  const { error } = await supabase.from(TABLE_NAME).update({ is_approved: isApproved }).eq('id', restaurantId);
  if (error) throw error;
}

export async function deleteRestaurant(restaurantId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase가 설정되지 않아 삭제할 수 없습니다.');
  }

  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', restaurantId);
  if (error) throw error;
}
