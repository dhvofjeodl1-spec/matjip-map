import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { deleteReport, fetchReports, updateReportStatus, type ReportRecord } from '@/lib/reports';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Trash2, CheckCircle2 } from 'lucide-react';
import { Link } from 'wouter';

const STATUS_OPTIONS: ReportRecord['status'][] = ['접수', '처리중', '완료'];

export default function AdminReports() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadReports = async () => {
    setLoading(true);
    try {
      const items = await fetchReports();
      setReports(items);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: '신고 내역을 불러오지 못했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const stats = useMemo(() => ({
    pending: reports.filter((item) => item.status === '접수').length,
    processing: reports.filter((item) => item.status === '처리중').length,
    completed: reports.filter((item) => item.status === '완료').length,
  }), [reports]);

  const handleStatusChange = async (reportId: string, nextStatus: ReportRecord['status']) => {
    try {
      await updateReportStatus(reportId, nextStatus);
      setReports((prev) => prev.map((item) => (item.id === reportId ? { ...item, status: nextStatus } : item)));
      toast({ title: '상태가 변경되었습니다.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: '상태 변경에 실패했습니다.' });
    }
  };

  const handleDelete = async (reportId: string) => {
    try {
      await deleteReport(reportId);
      setReports((prev) => prev.filter((item) => item.id !== reportId));
      toast({ title: '신고가 삭제되었습니다.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: '삭제에 실패했습니다.' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">신고 관리</p>
            <h1 className="mt-1 text-2xl font-bold">신고 내역</h1>
          </div>
          <Link href="/admin" className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
            <ArrowLeft size={16} />
            관리자 홈
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">접수</div>
            <div className="mt-2 text-2xl font-semibold">{stats.pending}건</div>
          </div>
          <div className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">처리중</div>
            <div className="mt-2 text-2xl font-semibold">{stats.processing}건</div>
          </div>
          <div className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">완료</div>
            <div className="mt-2 text-2xl font-semibold">{stats.completed}건</div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-gray-200 bg-white p-6 text-sm text-gray-500">불러오는 중...</div>
        ) : reports.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">신고 내역이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-gray-800">{report.reason}</div>
                    <div className="text-sm text-gray-600">{report.message || '상세 내용 없음'}</div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      <span>식당 ID: {report.restaurant_id}</span>
                      <span>·</span>
                      <span>{report.reporter_email || '익명'}</span>
                      <span>·</span>
                      <span>{new Date(report.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={report.status}
                      onChange={(event) => handleStatusChange(report.id, event.target.value as ReportRecord['status'])}
                      className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(report.id)}>
                      <Trash2 size={14} /> 삭제
                    </Button>
                    {report.status === '완료' ? <CheckCircle2 size={16} className="text-emerald-500" /> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
