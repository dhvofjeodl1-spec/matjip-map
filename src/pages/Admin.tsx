import React, { useEffect, useMemo, useState } from 'react';
import { supabase, ADMIN_EMAILS, isAdminEmail } from '@/lib/supabase';
import { approveRestaurant, deleteRestaurant, fetchAllRestaurants, setRestaurantApprovalStatus } from '@/lib/restaurants';
import { Restaurant } from '@/lib/mock-data';
import AddRestaurantModal from '@/components/AddRestaurantModal';
import { fetchReports, type ReportRecord } from '@/lib/reports';
import { setNoticeContent } from '@/lib/notice';
import { fetchSiteContent, saveSiteContent, type SiteContentRecord } from '@/lib/site-content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Search, CheckCircle2, XCircle, Trash2, Edit3, ShieldAlert } from 'lucide-react';
import { useLocation } from 'wouter';

const STATUS_FILTERS = ['전체', '승인대기', '승인완료'] as const;
const SORT_OPTIONS = ['최신순', '오래된순'] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];
type SortOption = (typeof SORT_OPTIONS)[number];

type RestaurantRow = Restaurant & { createdAt?: string };

function readSiteContentText(record: SiteContentRecord | null, key: string, fallback: string) {
  const value = record?.content?.[key];
  return typeof value === 'string' ? value : fallback;
}

export default function Admin() {
  const [isLoading, setIsLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('전체');
  const [sortOption, setSortOption] = useState<SortOption>('최신순');
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string | null } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [todayRegisteredCount, setTodayRegisteredCount] = useState(0);
  const [noticeTitle, setNoticeTitle] = useState('📢 공지사항');
  const [noticeText, setNoticeText] = useState('');
  const [aboutTitle, setAboutTitle] = useState('맛집맵 소개');
  const [aboutIntro, setAboutIntro] = useState('');
  const [aboutRegistrationMethod, setAboutRegistrationMethod] = useState('');
  const [aboutApprovalSystem, setAboutApprovalSystem] = useState('');
  const [aboutOperatingPrinciples, setAboutOperatingPrinciples] = useState('');
  const [aboutFaq, setAboutFaq] = useState('');
  const [contactTitle, setContactTitle] = useState('맛집맵 문의');
  const [contactEmail, setContactEmail] = useState('mailto:dhvofjeodl1@gmail.com');
  const [contactInquiryGuide, setContactInquiryGuide] = useState('');
  const [contactBugGuide, setContactBugGuide] = useState('');
  const [contactDeletionGuide, setContactDeletionGuide] = useState('');
  const [contactSuggestionGuide, setContactSuggestionGuide] = useState('');
  const [savingContent, setSavingContent] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const getUser = async () => {
      setAuthLoading(true);
      const { data } = await supabase?.auth.getUser();
      const user = data.user;
      setCurrentUser(user ? { id: user.id, email: user.email } : null);
      setAuthLoading(false);
    };

    getUser();

    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setCurrentUser(user ? { id: user.id, email: user.email } : null);
    }) ?? { data: null };

    return () => listener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser || !isAdminEmail(currentUser.email)) {
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const items = await fetchAllRestaurants(currentUser);
        setRestaurants(items);
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: '관리자 페이지를 불러오는 중 오류가 발생했습니다.' });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [currentUser, refreshVersion, toast]);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const items = await fetchReports();
        setReports(items);
        setReportCount(items.length);
      } catch {
        setReports([]);
        setReportCount(0);
      }
    };

    void loadReports();
  }, [refreshVersion]);

  useEffect(() => {
    if (!authLoading && (!currentUser || !isAdminEmail(currentUser.email))) {
      setLocation('/404');
    }
  }, [authLoading, currentUser, setLocation]);

  useEffect(() => {
    if (!currentUser || !isAdminEmail(currentUser.email)) {
      return;
    }

    const loadSiteContentFields = async () => {
      try {
        const [noticeData, aboutData, contactData] = await Promise.all([
          fetchSiteContent('notice'),
          fetchSiteContent('about'),
          fetchSiteContent('contact'),
        ]);

        setNoticeTitle(readSiteContentText(noticeData, 'title', '📢 공지사항'));
        setNoticeText(readSiteContentText(noticeData, 'body', ''));
        setAboutTitle(readSiteContentText(aboutData, 'pageTitle', '맛집맵 소개'));
        setAboutIntro(readSiteContentText(aboutData, 'intro', ''));
        setAboutRegistrationMethod(readSiteContentText(aboutData, 'registrationMethod', ''));
        setAboutApprovalSystem(readSiteContentText(aboutData, 'approvalSystem', ''));
        setAboutOperatingPrinciples(readSiteContentText(aboutData, 'operatingPrinciples', ''));
        setAboutFaq(readSiteContentText(aboutData, 'faq', ''));
        setContactTitle(readSiteContentText(contactData, 'pageTitle', '맛집맵 문의'));
        setContactEmail(readSiteContentText(contactData, 'contactEmailOrUrl', 'mailto:dhvofjeodl1@gmail.com'));
        setContactInquiryGuide(readSiteContentText(contactData, 'inquiryGuide', ''));
        setContactBugGuide(readSiteContentText(contactData, 'bugReportGuide', ''));
        setContactDeletionGuide(readSiteContentText(contactData, 'deletionRequestGuide', ''));
        setContactSuggestionGuide(readSiteContentText(contactData, 'serviceSuggestionGuide', ''));
      } catch (error) {
        console.error(error);
      }
    };

    void loadSiteContentFields();
  }, [currentUser]);

  const filteredRestaurants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return restaurants
      .filter((restaurant) => {
        if (statusFilter === '승인대기') return restaurant.isApproved === false;
        if (statusFilter === '승인완료') return restaurant.isApproved === true;
        return true;
      })
      .filter((restaurant) => {
        if (!query) return true;
        return [restaurant.name, restaurant.address, restaurant.ownerEmail ?? '']
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortOption === '최신순' ? bDate - aDate : aDate - bDate;
      });
  }, [restaurants, searchQuery, statusFilter, sortOption]);

  const pendingCount = restaurants.filter((item) => item.isApproved === false).length;
  const approvedCount = restaurants.filter((item) => item.isApproved === true).length;
  const todayRegisteredCountValue = useMemo(() => {
    const today = new Date();
    const todayString = today.toISOString().slice(0, 10);
    return restaurants.filter((item) => item.createdAt?.slice(0, 10) === todayString).length;
  }, [restaurants]);

  useEffect(() => {
    setTodayRegisteredCount(todayRegisteredCountValue);
  }, [todayRegisteredCountValue]);

  const refreshList = () => setRefreshVersion((value) => value + 1);

  const handleSaveContent = async () => {
    if (!currentUser?.email) {
      toast({ variant: 'destructive', title: '로그인이 필요합니다.' });
      return;
    }

    setSavingContent(true);
    try {
      setNoticeContent(noticeText);
      await Promise.all([
        saveSiteContent(
          'notice',
          {
            title: noticeTitle,
            content: { title: noticeTitle, body: noticeText },
            isActive: true,
          },
          currentUser.email,
        ),
        saveSiteContent(
          'about',
          {
            title: aboutTitle,
            content: {
              pageTitle: aboutTitle,
              intro: aboutIntro,
              registrationMethod: aboutRegistrationMethod,
              approvalSystem: aboutApprovalSystem,
              operatingPrinciples: aboutOperatingPrinciples,
              faq: aboutFaq,
            },
            isActive: true,
          },
          currentUser.email,
        ),
        saveSiteContent(
          'contact',
          {
            title: contactTitle,
            content: {
              pageTitle: contactTitle,
              contactEmailOrUrl: contactEmail,
              inquiryGuide: contactInquiryGuide,
              bugReportGuide: contactBugGuide,
              deletionRequestGuide: contactDeletionGuide,
              serviceSuggestionGuide: contactSuggestionGuide,
            },
            isActive: true,
          },
          currentUser.email,
        ),
      ]);

      toast({ title: '서비스 콘텐츠가 저장되었습니다.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: '콘텐츠 저장에 실패했습니다.' });
    } finally {
      setSavingContent(false);
    }
  };

  const handleApprove = async (restaurantId: string) => {
    try {
      await approveRestaurant(restaurantId);
      toast({ title: '승인되었습니다.' });
      refreshList();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: '승인 중 오류가 발생했습니다.' });
    }
  };

  const handleCancelApprove = async (restaurantId: string) => {
    try {
      await setRestaurantApprovalStatus(restaurantId, false);
      toast({ title: '승인이 취소되었습니다.' });
      refreshList();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: '승인 취소 중 오류가 발생했습니다.' });
    }
  };

  const handleDeleteConfirm = (restaurantId: string) => {
    setPendingDeleteId(restaurantId);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      await deleteRestaurant(pendingDeleteId);
      toast({ title: '삭제되었습니다.' });
      refreshList();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: '삭제 중 오류가 발생했습니다.' });
    } finally {
      setIsConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setIsEditModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className="p-6">
        <div>로그인 확인 중...</div>
      </div>
    );
  }

  if (!currentUser || !isAdminEmail(currentUser.email)) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">관리자 페이지</h1>
            <p className="mt-1 text-sm text-gray-500">등록된 맛집을 검토하고 관리합니다.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">승인 대기</div>
              <div className="mt-2 text-2xl font-semibold">{pendingCount}건</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">승인 완료</div>
              <div className="mt-2 text-2xl font-semibold">{approvedCount}건</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">오늘 등록</div>
              <div className="mt-2 text-2xl font-semibold">{todayRegisteredCount}건</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">신고 접수</div>
              <div className="mt-2 text-2xl font-semibold">{reportCount}건</div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2">
            <Label htmlFor="admin-search">검색</Label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                id="admin-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="맛집명, 주소, 등록자 이메일 검색"
              />
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
                <Search size={18} />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="status-filter">필터</Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="sort-option">정렬</Label>
            <select
              id="sort-option"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => window.location.assign('/admin/reports')}>
          <ShieldAlert size={16} /> 신고 관리
        </Button>
      </div>

      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">서비스 콘텐츠 편집</h2>
            <p className="mt-1 text-sm text-gray-500">공개 페이지의 공지, 소개, 문의 안내를 관리합니다.</p>
          </div>
          <Button onClick={handleSaveContent} disabled={savingContent}>
            {savingContent ? '저장 중...' : '콘텐츠 저장'}
          </Button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold">공지사항</h3>
            <Label htmlFor="notice-title" className="mt-4 block text-sm">제목</Label>
            <Input id="notice-title" value={noticeTitle} onChange={(event) => setNoticeTitle(event.target.value)} className="mt-2" />
            <Label htmlFor="notice-body" className="mt-4 block text-sm">본문</Label>
            <textarea
              id="notice-body"
              value={noticeText}
              onChange={(event) => setNoticeText(event.target.value)}
              rows={6}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none"
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold">서비스 소개</h3>
            <Label htmlFor="about-title" className="mt-4 block text-sm">페이지 제목</Label>
            <Input id="about-title" value={aboutTitle} onChange={(event) => setAboutTitle(event.target.value)} className="mt-2" />
            <Label htmlFor="about-intro" className="mt-4 block text-sm">소개 문구</Label>
            <textarea id="about-intro" value={aboutIntro} onChange={(event) => setAboutIntro(event.target.value)} rows={3} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none" />
            <Label htmlFor="about-registration" className="mt-4 block text-sm">등록 방법</Label>
            <textarea id="about-registration" value={aboutRegistrationMethod} onChange={(event) => setAboutRegistrationMethod(event.target.value)} rows={2} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none" />
            <Label htmlFor="about-approval" className="mt-4 block text-sm">승인 시스템</Label>
            <textarea id="about-approval" value={aboutApprovalSystem} onChange={(event) => setAboutApprovalSystem(event.target.value)} rows={2} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none" />
            <Label htmlFor="about-principles" className="mt-4 block text-sm">운영 원칙</Label>
            <textarea id="about-principles" value={aboutOperatingPrinciples} onChange={(event) => setAboutOperatingPrinciples(event.target.value)} rows={2} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none" />
            <Label htmlFor="about-faq" className="mt-4 block text-sm">FAQ</Label>
            <textarea id="about-faq" value={aboutFaq} onChange={(event) => setAboutFaq(event.target.value)} rows={2} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none" />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold">문의하기</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="contact-title" className="block text-sm">페이지 제목</Label>
                <Input id="contact-title" value={contactTitle} onChange={(event) => setContactTitle(event.target.value)} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="contact-email" className="block text-sm">연락처</Label>
                <Input id="contact-email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="mt-2" />
              </div>
            </div>
            <Label htmlFor="contact-inquiry" className="mt-4 block text-sm">문의 안내</Label>
            <textarea id="contact-inquiry" value={contactInquiryGuide} onChange={(event) => setContactInquiryGuide(event.target.value)} rows={2} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none" />
            <Label htmlFor="contact-bug" className="mt-4 block text-sm">버그 제보 안내</Label>
            <textarea id="contact-bug" value={contactBugGuide} onChange={(event) => setContactBugGuide(event.target.value)} rows={2} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none" />
            <Label htmlFor="contact-deletion" className="mt-4 block text-sm">삭제 요청 안내</Label>
            <textarea id="contact-deletion" value={contactDeletionGuide} onChange={(event) => setContactDeletionGuide(event.target.value)} rows={2} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none" />
            <Label htmlFor="contact-suggestion" className="mt-4 block text-sm">서비스 제안 안내</Label>
            <textarea id="contact-suggestion" value={contactSuggestionGuide} onChange={(event) => setContactSuggestionGuide(event.target.value)} rows={2} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          {filteredRestaurants.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
              조건에 맞는 식당이 없습니다.
            </div>
          ) : (
            filteredRestaurants.map((restaurant) => (
              <div key={restaurant.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <h2 className="truncate text-xl font-semibold">{restaurant.name}</h2>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                      <span>{restaurant.category}</span>
                      <span>·</span>
                      <span>{restaurant.address}</span>
                      <span>·</span>
                      <span>{restaurant.ownerEmail ?? '등록자 없음'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                      <span>{restaurant.createdAt ? new Date(restaurant.createdAt).toLocaleString() : '등록일 정보 없음'}</span>
                      <span>·</span>
                      <span>{restaurant.isApproved ? '승인완료' : '승인대기'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {restaurant.isApproved ? (
                      <Button variant="outline" size="sm" onClick={() => handleCancelApprove(restaurant.id)}>
                        승인취소
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleApprove(restaurant.id)}>
                        승인
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(restaurant)}>
                      <Edit3 size={16} /> 수정
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteConfirm(restaurant.id)}>
                      <Trash2 size={16} /> 삭제
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">최근 활동</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
              <div className="font-semibold text-gray-800">최신 등록</div>
              <div className="mt-1">{restaurants[0]?.name ?? '등록된 식당 없음'}</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
              <div className="font-semibold text-gray-800">최신 신고</div>
              <div className="mt-1">{reports[0] ? `${reports[0].reason} · ${reports[0].status}` : '신고 없음'}</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
              <div className="font-semibold text-gray-800">최신 사용자</div>
              <div className="mt-1">{currentUser?.email ?? '로그인 필요'}</div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>삭제 확인</DialogTitle>
            <DialogDescription>정말 삭제하시겠습니까?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddRestaurantModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onRegistered={() => {
          setIsEditModalOpen(false);
          setEditingRestaurant(null);
          refreshList();
        }}
        mode="edit"
        restaurant={editingRestaurant}
        currentUser={currentUser}
      />
    </div>
  );
}
