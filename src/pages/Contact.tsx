import { useEffect, useMemo, useState } from 'react';
import { Mail, Bug, Trash2, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { fetchSiteContent, type SiteContentRecord } from '@/lib/site-content';

function readText(record: SiteContentRecord | null, key: string, fallback: string) {
  const value = record?.content?.[key];
  return typeof value === 'string' ? value : fallback;
}

export default function Contact() {
  const [record, setRecord] = useState<SiteContentRecord | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const data = await fetchSiteContent('contact');
      if (isMounted) {
        setRecord(data);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const items = useMemo(
    () => [
      {
        title: '문의하기',
        description: readText(record, 'inquiryGuide', '서비스 이용 관련 문의를 남겨주세요.'),
        icon: Mail,
        href: readText(record, 'contactEmailOrUrl', 'mailto:dhvofjeodl1@gmail.com'),
      },
      {
        title: '버그 제보',
        description: readText(record, 'bugReportGuide', '지도 오류나 화면 문제를 알려주세요.'),
        icon: Bug,
        href: `${readText(record, 'contactEmailOrUrl', 'mailto:dhvofjeodl1@gmail.com')}?subject=버그%20제보`,
      },
      {
        title: '삭제 요청',
        description: readText(record, 'deletionRequestGuide', '부적절한 정보나 잘못된 맛집 등록을 요청하세요.'),
        icon: Trash2,
        href: `${readText(record, 'contactEmailOrUrl', 'mailto:dhvofjeodl1@gmail.com')}?subject=삭제%20요청`,
      },
      {
        title: '서비스 제안',
        description: readText(record, 'serviceSuggestionGuide', '새 기능이나 개선 아이디어를 공유해주세요.'),
        icon: Sparkles,
        href: `${readText(record, 'contactEmailOrUrl', 'mailto:dhvofjeodl1@gmail.com')}?subject=서비스%20제안`,
      },
    ],
    [record],
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-800 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2 text-sm font-semibold text-gray-600">
            <Link href="/" className="rounded-full bg-gray-50 px-3 py-2">홈</Link>
            <Link href="/about" className="rounded-full bg-gray-50 px-3 py-2">서비스 소개</Link>
            <Link href="/contact" className="rounded-full bg-orange-50 px-3 py-2 text-primary">문의하기</Link>
          </div>
        </div>

        <div className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">맛지도 문의</p>
          <h1 className="mt-2 text-2xl font-bold">{readText(record, 'pageTitle', '맛지도 문의')}</h1>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {readText(record, 'inquiryGuide', '운영팀으로 바로 연결되는 메일 안내를 제공합니다. 상황에 맞는 항목을 선택해 주세요.')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <a key={item.title} href={item.href} className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:bg-orange-50">
                <div className="flex items-center gap-2 text-primary">
                  <Icon size={16} />
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                </div>
                <p className="mt-2 text-sm leading-7 text-gray-600">{item.description}</p>
              </a>
            );
          })}
        </div>

        <div className="rounded-[24px] border border-orange-100 bg-orange-50 p-4 text-sm text-primary">
          <Link href="/">홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
