import React, { useEffect, useMemo, useState } from 'react';
import { supabase, ADMIN_EMAILS, isAdminEmail } from '@/lib/supabase';
import { approveRestaurant, deleteRestaurant, fetchAllRestaurants, setRestaurantApprovalStatus } from '@/lib/restaurants';
import { Restaurant } from '@/lib/mock-data';
import AddRestaurantModal from '@/components/AddRestaurantModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Search, CheckCircle2, XCircle, Trash2, Edit3 } from 'lucide-react';

const STATUS_FILTERS = ['전체', '승인대기', '승인완료'] as const;
const SORT_OPTIONS = ['최신순', '오래된순'] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];
type SortOption = (typeof SORT_OPTIONS)[number];

type RestaurantRow = Restaurant & { createdAt?: string };

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
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  const { toast } = useToast();

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
    if (!authLoading && currentUser && !isAdminEmail(currentUser.email)) {
      setShowUnauthorized(true);
    }
  }, [authLoading, currentUser]);

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

  const refreshList = () => setRefreshVersion((value) => value + 1);

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
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          관리자만 접근 가능합니다.
        </div>
      </div>
    );
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
              <div className="text-sm text-gray-500">승인대기</div>
              <div className="mt-2 text-2xl font-semibold">{pendingCount}건</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">승인완료</div>
              <div className="mt-2 text-2xl font-semibold">{approvedCount}건</div>
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

      <div className="grid gap-4">
        {filteredRestaurants.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
            조건에 맞는 식당이 없습니다.
          </div>
        ) : (
          filteredRestaurants.map((restaurant) => {
            const canManage = isAdminEmail(currentUser.email);
            return (
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
            );
          })
        )}
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
