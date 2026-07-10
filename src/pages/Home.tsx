import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import MapView from '@/components/MapView';
import SearchBar from '@/components/SearchBar';
import CategoryScroll from '@/components/CategoryScroll';
import BottomCard from '@/components/BottomCard';
import AddRestaurantModal from '@/components/AddRestaurantModal';
import { Category, Restaurant } from '@/lib/mock-data';
import { fetchAllRestaurants } from '@/lib/restaurants';
import { supabase, isAdminEmail } from '@/lib/supabase';
import { Plus, Loader2, Heart, LogIn, LogOut, UserCircle2, Menu, X, Shield, Info, Mail } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [favoriteVersion, setFavoriteVersion] = useState(0);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string | null } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const loadRestaurants = useCallback(async () => {
    setIsLoading(true);
    try {
      const restaurants = await fetchAllRestaurants(currentUser ?? undefined);
      setAllRestaurants(restaurants);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      setAuthLoading(true);
      const { data } = await supabase?.auth.getSession();
      const user = data.session?.user ?? null;
      if (!isMounted) return;
      setCurrentUser(user ? { id: user.id, email: user.email } : null);
      setAuthLoading(false);
    };

    void syncSession();

    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      if (!isMounted) return;
      setCurrentUser(user ? { id: user.id, email: user.email } : null);
      setAuthLoading(false);
    }) ?? { data: null };

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleFavoritesUpdated = () => {
      setFavoriteVersion((value) => value + 1);
    };

    window.addEventListener('favorites-updated', handleFavoritesUpdated);
    return () => window.removeEventListener('favorites-updated', handleFavoritesUpdated);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const favoriteRestaurantIds = useMemo(() => {
    try {
      const storedFavorites = JSON.parse(localStorage.getItem('favorite-restaurants') || '[]') as string[];
      return new Set(storedFavorites);
    } catch {
      return new Set<string>();
    }
  }, [favoriteVersion]);

  const email = currentUser?.email?.trim().toLowerCase();
  const isAdmin = isAdminEmail(email);
  const displayName = currentUser?.email ? currentUser.email.split('@')[0] : 'User';
  const compactDisplayName = displayName.length > 10 ? `${displayName.slice(0, 10)}...` : displayName;

  const filteredRestaurants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allRestaurants.filter((restaurant) => {
      if (restaurant.isApproved === false && !isAdmin) {
        return false;
      }

      const matchesCategory = !selectedCategory || restaurant.category === selectedCategory;

      const searchableText = [
        restaurant.name,
        restaurant.address,
        restaurant.category,
        restaurant.shortReview,
        restaurant.menu?.[0]?.name,
        ...(restaurant.menu?.map((item) => item.name) ?? []),
        ...(restaurant.tags ?? []),
        (restaurant as Restaurant & { phone?: string }).phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesQuery = !query || searchableText.includes(query);
      const matchesFavorites = !showOnlyFavorites || favoriteRestaurantIds.has(restaurant.id);

      return matchesCategory && matchesQuery && matchesFavorites;
    });
  }, [allRestaurants, selectedCategory, searchQuery, showOnlyFavorites, favoriteRestaurantIds]);

  const selectedRestaurant = useMemo(() => {
    if (!selectedRestaurantId) return null;
    return allRestaurants.find((r) => r.id === selectedRestaurantId) || null;
  }, [allRestaurants, selectedRestaurantId]);

  const isBottomCardOpen = Boolean(selectedRestaurant);

  const handleMapClick = () => {
    setSelectedRestaurantId(null);
  };

  const closeMobileOverlays = () => {
    setIsSearchOpen(false);
    setIsCategoryOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleOpenMenu = () => {
    setIsSearchOpen(false);
    setIsCategoryOpen(false);
    setIsMobileMenuOpen((value) => !value);
  };

  const handleOpenSearch = (nextOpen: boolean) => {
    setIsSearchOpen(nextOpen);
    if (nextOpen) {
      setIsCategoryOpen(false);
      setIsMobileMenuOpen(false);
    }
  };

  const handleOpenCategory = (nextOpen: boolean) => {
    setIsCategoryOpen(nextOpen);
    if (nextOpen) {
      setIsSearchOpen(false);
      setIsMobileMenuOpen(false);
    }
  };

  const handleCategorySelect = (category: Category | null) => {
    setSelectedCategory(category);
    if (selectedRestaurant && category && selectedRestaurant.category !== category) {
      setSelectedRestaurantId(null);
    }
  };

  const handleRestaurantSaved = useCallback(
    async (restaurantId?: string) => {
      await loadRestaurants();
      if (restaurantId) {
        setSelectedRestaurantId(restaurantId);
      }
      setIsEditModalOpen(false);
      setEditingRestaurant(null);
    },
    [loadRestaurants],
  );

  const handleRestaurantApproved = useCallback(async () => {
    await loadRestaurants();
  }, [loadRestaurants]);

  const handleLogin = async () => {
    await supabase?.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    setCurrentUser(null);
    setIsMobileMenuOpen(false);
  };

  const handleRestaurantDeleted = useCallback((restaurantId: string) => {
    setAllRestaurants((prev) => prev.filter((restaurant) => restaurant.id !== restaurantId));
    setSelectedRestaurantId(null);
  }, []);

  const handleEditRestaurant = useCallback((restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setIsEditModalOpen(true);
  }, []);

  const handleAdminClick = () => {
    setLocation('/admin');
    closeMobileOverlays();
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-gray-50">
      <MapView
        restaurants={filteredRestaurants}
        selectedRestaurantId={selectedRestaurantId}
        onSelectRestaurant={setSelectedRestaurantId}
        onMapClick={handleMapClick}
        isBottomCardOpen={isBottomCardOpen}
      />

      <div
        className="absolute inset-x-2 z-30 flex w-[calc(100%-1rem)] flex-col gap-1.5 rounded-[24px] border border-white/70 bg-white/90 p-2 shadow-[0_16px_48px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:inset-x-3 sm:w-[calc(100%-1.5rem)] sm:gap-2 sm:p-2.5"
        style={{ top: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SearchBar onSearch={setSearchQuery} isOpen={isSearchOpen} onToggle={handleOpenSearch} />
            <div className="min-w-0 flex-1">
              <CategoryScroll selectedCategory={selectedCategory} onSelectCategory={handleCategorySelect} isOpen={isCategoryOpen} onToggle={handleOpenCategory} />
            </div>
          </div>
          <div ref={mobileMenuRef} className="relative shrink-0 md:hidden">
            <button
              type="button"
              onClick={handleOpenMenu}
              className="relative z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
              aria-label="메뉴 열기"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {isMobileMenuOpen ? (
              <div className="absolute right-0 top-full z-[55] mt-2 w-[220px] rounded-[20px] border border-gray-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
                <div className="mb-2 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-[12px] text-gray-600">
                  {currentUser ? (
                    <div className="flex items-center gap-2 overflow-hidden">
                      <UserCircle2 size={14} className="shrink-0 text-gray-500" />
                      <span className="truncate overflow-hidden text-ellipsis whitespace-nowrap">{compactDisplayName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <UserCircle2 size={14} className="shrink-0" />
                      <span>로그인이 필요합니다</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowOnlyFavorites((value) => !value);
                    setIsMobileMenuOpen(false);
                    setIsSearchOpen(false);
                    setIsCategoryOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] font-semibold ${
                    showOnlyFavorites ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Heart size={14} fill={showOnlyFavorites ? 'currentColor' : 'none'} />
                    즐겨찾기만 보기
                  </span>
                  {showOnlyFavorites ? <span className="text-[11px]">ON</span> : null}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLocation('/about');
                    setIsMobileMenuOpen(false);
                    setIsSearchOpen(false);
                    setIsCategoryOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-[13px] font-semibold text-gray-700"
                >
                  <Info size={14} />
                  서비스 소개
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLocation('/contact');
                    setIsMobileMenuOpen(false);
                    setIsSearchOpen(false);
                    setIsCategoryOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-[13px] font-semibold text-gray-700"
                >
                  <Mail size={14} />
                  문의하기
                </button>

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={handleAdminClick}
                    className="mt-2 flex w-full items-center justify-start gap-2 rounded-xl bg-orange-50 px-3 py-2 text-[13px] font-semibold text-primary"
                  >
                    <Shield size={14} />
                    관리자 페이지
                  </button>
                ) : null}

                {authLoading ? (
                  <div className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-500">
                    로그인 상태 확인 중...
                  </div>
                ) : currentUser ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-gray-700"
                  >
                    <LogOut size={14} />
                    로그아웃
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleLogin();
                      setIsMobileMenuOpen(false);
                      setIsSearchOpen(false);
                      setIsCategoryOpen(false);
                    }}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-gray-700"
                  >
                    <LogIn size={14} />
                    Google 로그인
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="hidden md:flex md:items-center md:justify-between md:gap-2">
          <button
            type="button"
            onClick={() => setShowOnlyFavorites((value) => !value)}
            className={`flex h-9 min-w-[126px] flex-1 items-center justify-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold shadow-sm transition-all ${
              showOnlyFavorites ? 'border-red-200 bg-red-50 text-red-500 shadow-red-100' : 'border-gray-200 bg-white/95 text-gray-700 hover:border-orange-200 hover:bg-orange-50'
            }`}
          >
            <Heart size={15} fill={showOnlyFavorites ? 'currentColor' : 'none'} />
            즐겨찾기만 보기
          </button>

          <div className="flex shrink-0 items-center justify-end gap-2">
            {authLoading ? (
              <div className="inline-flex h-9 min-w-[96px] items-center justify-center rounded-full border border-gray-200 bg-white/95 px-3 text-[13px] font-medium text-gray-500 shadow-sm">
                로딩 중...
              </div>
            ) : currentUser ? (
              <>
                <div className="inline-flex h-9 max-w-[126px] items-center gap-2 overflow-hidden rounded-full border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700 shadow-sm">
                  <UserCircle2 size={15} className="shrink-0" />
                  <span className="truncate">{compactDisplayName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-[13px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  <LogOut size={15} />
                  로그아웃
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-[13px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <LogIn size={15} />
                로그인
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="absolute left-1/2 top-[128px] z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-orange-100 bg-white/95 px-3 py-2 text-sm font-medium text-gray-600 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          <Loader2 size={14} className="animate-spin text-primary" />
          맛집을 불러오는 중...
        </div>
      )}

      <button
        onClick={() => setIsAddModalOpen(true)}
        className="absolute z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_16px_40px_rgba(249,115,22,0.28)] transition-all active:scale-95"
        style={{
          right: '14px',
          bottom: isBottomCardOpen
            ? 'calc(122px + env(safe-area-inset-bottom, 0px))'
            : 'calc(18px + env(safe-area-inset-bottom, 0px))',
        }}
        aria-label="맛집 등록하기"
        data-testid="button-add-restaurant"
      >
        <Plus size={24} />
      </button>

      <BottomCard
        restaurant={selectedRestaurant}
        currentUser={currentUser}
        onClose={() => setSelectedRestaurantId(null)}
        onDelete={handleRestaurantDeleted}
        onEdit={handleEditRestaurant}
        onApprove={handleRestaurantApproved}
      />

      <AddRestaurantModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onRegistered={handleRestaurantSaved}
        currentUser={currentUser}
      />

      <AddRestaurantModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onRegistered={handleRestaurantSaved}
        mode="edit"
        restaurant={editingRestaurant}
        currentUser={currentUser}
      />
    </div>
  );
}
