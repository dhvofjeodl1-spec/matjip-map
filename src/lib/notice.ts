const NOTICE_CONTENT_KEY = 'matjip-map-notice-content';
const NOTICE_DISMISS_KEY = 'matjip-map-notice-dismiss-until';

export const DEFAULT_NOTICE_CONTENT = [
  '맛집맵 베타 서비스입니다.',
  '',
  '등록된 맛집은 관리자 승인 후 공개됩니다.',
  '',
  '잘못된 정보는 신고 기능을 이용해주세요.',
].join('\n');

export function getNoticeContent(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_NOTICE_CONTENT;
  }

  try {
    return window.localStorage.getItem(NOTICE_CONTENT_KEY) || DEFAULT_NOTICE_CONTENT;
  } catch {
    return DEFAULT_NOTICE_CONTENT;
  }
}

export function setNoticeContent(nextContent: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(NOTICE_CONTENT_KEY, nextContent);
  } catch {
    // ignore storage errors
  }
}

export function shouldShowNotice(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const dismissedUntil = Number(window.localStorage.getItem(NOTICE_DISMISS_KEY) || 0);
    return Date.now() >= dismissedUntil;
  } catch {
    return true;
  }
}

export function dismissNoticeFor24Hours(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const until = Date.now() + 24 * 60 * 60 * 1000;
    window.localStorage.setItem(NOTICE_DISMISS_KEY, String(until));
  } catch {
    // ignore storage errors
  }
}
