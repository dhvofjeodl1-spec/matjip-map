import { supabase, isSupabaseConfigured } from './supabase';

export type ReportReason = '잘못된 위치' | '폐업' | '중복 등록' | '부적절한 내용' | '기타';

export interface ReportRecord {
  id: string;
  restaurant_id: string;
  reason: ReportReason | string;
  message: string;
  reporter_email: string | null;
  created_at: string;
  status: '접수' | '처리중' | '완료';
}

const TABLE_NAME = 'reports';
const STORAGE_KEY = 'matjido-reports';

function readLocalReports(): ReportRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ReportRecord[];
  } catch {
    return [];
  }
}

function writeLocalReports(reports: ReportRecord[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // ignore
  }
}

export async function createReport(input: {
  restaurantId: string;
  reason: ReportReason | string;
  message: string;
  reporterEmail?: string | null;
}): Promise<void> {
  const payload: ReportRecord = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
    restaurant_id: input.restaurantId,
    reason: input.reason,
    message: input.message,
    reporter_email: input.reporterEmail?.trim() || null,
    created_at: new Date().toISOString(),
    status: '접수',
  };

  if (!isSupabaseConfigured || !supabase) {
    const reports = readLocalReports();
    writeLocalReports([payload, ...reports]);
    return;
  }

  const { error } = await supabase.from(TABLE_NAME).insert({
    restaurant_id: input.restaurantId,
    reason: input.reason,
    message: input.message,
    reporter_email: input.reporterEmail?.trim() || null,
    status: '접수',
  });

  if (error) {
    const reports = readLocalReports();
    writeLocalReports([payload, ...reports]);
    return;
  }
}

export async function fetchReports(): Promise<ReportRecord[]> {
  if (!isSupabaseConfigured || !supabase) {
    return readLocalReports();
  }

  const { data, error } = await supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });
  if (error) {
    return readLocalReports();
  }

  return (data ?? []) as ReportRecord[];
}

export async function updateReportStatus(reportId: string, status: ReportRecord['status']): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const reports = readLocalReports().map((report) => (report.id === reportId ? { ...report, status } : report));
    writeLocalReports(reports);
    return;
  }

  const { error } = await supabase.from(TABLE_NAME).update({ status }).eq('id', reportId);
  if (error) throw error;
}

export async function deleteReport(reportId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const reports = readLocalReports().filter((report) => report.id !== reportId);
    writeLocalReports(reports);
    return;
  }

  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', reportId);
  if (error) throw error;
}
