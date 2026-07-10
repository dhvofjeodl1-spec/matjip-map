import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { dismissNoticeFor24Hours, getNoticeContent, shouldShowNotice } from '@/lib/notice';

export default function NoticeDialog() {
  const [open, setOpen] = useState(false);
  const [noticeText, setNoticeText] = useState('');

  useEffect(() => {
    if (shouldShowNotice()) {
      setNoticeText(getNoticeContent());
      setOpen(true);
    }
  }, []);

  const lines = useMemo(() => noticeText.split('\n').filter((line) => line.trim().length > 0), [noticeText]);

  const handleDismiss = () => {
    setOpen(false);
  };

  const handleHideForDay = () => {
    dismissNoticeFor24Hours();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md rounded-[24px] border border-orange-100 p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl font-semibold text-gray-900">📢 공지사항</DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-7 text-gray-600">
            {lines.length > 0 ? (
              <div className="space-y-2">
                {lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : (
              <p>서비스 공지사항이 없습니다.</p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleDismiss}>
            닫기
          </Button>
          <Button onClick={handleHideForDay}>오늘 하루 보지 않기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
