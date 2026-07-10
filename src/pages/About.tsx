import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { fetchSiteContent, type SiteContentRecord } from '@/lib/site-content';

function readText(record: SiteContentRecord | null, key: string, fallback: string) {
  const value = record?.content?.[key];
  return typeof value === 'string' ? value : fallback;
}

export default function About() {
  const [record, setRecord] = useState<SiteContentRecord | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const data = await fetchSiteContent('about');
      if (isMounted) {
        setRecord(data);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const sections = useMemo(
    () => [
      {
        title: '서비스 소개',
        body: readText(record, 'intro', '맛지도는 지역 맛집을 지도 위에서 쉽게 찾고, 등록하고, 확인할 수 있는 베타 서비스입니다.'),
      },
      {
        title: '맛집 등록 방법',
        body: readText(record, 'registrationMethod', '지도에서 원하는 위치를 선택하고 맛집 정보를 입력하면 관리자의 승인 후 공개됩니다.'),
      },
      {
        title: '승인 시스템',
        body: readText(record, 'approvalSystem', '등록된 맛집은 관리자 승인 후 지도에 노출되어 더 신뢰성 있는 정보를 제공합니다.'),
      },
      {
        title: '운영 원칙',
        body: readText(record, 'operatingPrinciples', '정확한 정보와 안전한 이용을 위해 잘못된 정보는 신고 기능으로 알려주세요.'),
      },
      {
        title: 'FAQ',
        body: readText(record, 'faq', '로그인 없이도 둘러볼 수 있지만, 등록·신고 기능은 로그인 후 이용할 수 있습니다.'),
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
            <Link href="/about" className="rounded-full bg-orange-50 px-3 py-2 text-primary">서비스 소개</Link>
            <Link href="/contact" className="rounded-full bg-gray-50 px-3 py-2">문의하기</Link>
          </div>
        </div>

        <div className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">맛지도 서비스 소개</p>
          <h1 className="mt-2 text-2xl font-bold">{readText(record, 'pageTitle', '맛지도 소개')}</h1>
          <p className="mt-3 text-sm leading-7 text-gray-600">
            {readText(record, 'intro', '맛지도는 지도에서 맛집을 발견하고, 직접 등록하며, 신뢰할 수 있는 정보를 공유하는 서비스입니다.')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <div key={section.title} className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-gray-600">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[24px] border border-orange-100 bg-orange-50 p-4 text-sm text-primary">
          <Link href="/">홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
