// Supabase 초기화
//
// 아래 환경변수가 모두 설정되어 있어야 등록/조회 기능이 활성화됩니다.
// 하나라도 비어 있으면 `isSupabaseConfigured`가 false가 되고, 앱은 목업 데이터로 동작합니다.
// (URL과 anon key는 Supabase 프로젝트 > Project Settings > API에서 확인할 수 있는
// 공개 클라이언트 값입니다. service_role 키 같은 비밀 값은 여기서 사용하지 않습니다.)
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // eslint-disable-next-line no-console
  console.warn(
    '[matjip-map] Supabase 환경변수가 설정되지 않아 등록/조회 기능이 비활성화됩니다. 목업 데이터로 동작합니다.',
  );
}

export { supabase };

/**
 * restaurants 테이블에 필요한 스키마 (Supabase SQL Editor에서 실행):
 *
 * create table restaurants (
 *   id uuid primary key default gen_random_uuid(),
 *   name text not null,
 *   address text not null,
 *   category text not null,
 *   menu jsonb not null default '[]',
 *   short_review text not null default '',
 *   lat double precision not null,
 *   lng double precision not null,
 *   rating numeric not null default 0,
 *   review_count integer not null default 0,
 *   is_open boolean not null default true,
 *   image_url text,
 *   tags jsonb not null default '[]',
 *   phone text,
 *   blog_review_url text,
 *   is_approved boolean not null default true,
 *   created_at timestamptz not null default now()
 * );
 *
 * alter table restaurants add column if not exists phone text;
 * alter table restaurants add column if not exists blog_review_url text;
 * alter table restaurants add column if not exists is_approved boolean not null default true;
 *
 * alter table restaurants enable row level security;
 * create policy "Public read" on restaurants for select using (true);
 * create policy "Public insert" on restaurants for insert with check (true);
 * create policy "Public update" on restaurants for update using (true) with check (true);
 * create policy "Public delete" on restaurants for delete using (true);
 */
