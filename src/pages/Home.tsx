import React, { useState, useMemo, useEffect, useCallback } from 'react';
import MapView from '@/components/MapView';
import SearchBar from '@/components/SearchBar';
import CategoryScroll from '@/components/CategoryScroll';
import BottomCard from '@/components/BottomCard';
import AddRestaurantModal from '@/components/AddRestaurantModal';
import { Category, Restaurant } from '@/lib/mock-data';
import { fetchAllRestaurants } from '@/lib/restaurants';
import { supabase, ADMIN_EMAILS } from '@/lib/supabase';
import { Plus, Loader2, Heart, LogIn, LogOut, UserCircle2 } from 'lucide-react';

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
    const getUser = async () => {
      setAuthLoading(true);
      const { data } = await supabase?.auth.getUser();
      setCurrentUser(data.user ? { id: data.user.id, email: data.user.email } : null);
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
    const handleFavoritesUpdated = () => {
      setFavoriteVersion((value) => value + 1);
    };

    window.addEventListener('favorites-updated', handleFavoritesUpdated);
    return () => window.removeEventListener('favorites-updated', handleFavoritesUpdated);
  }, []);

  const favoriteRestaurantIds = useMemo(() => {
    try {
      const storedFavorites = JSON.parse(localStorage.getItem('favorite-restaurants') || '[]') as string[];
      return new Set(storedFavorites);
    } catch {
      return new Set<string>();
    }
  }, [favoriteVersion]);

  const isAdmin = Boolean(currentUser?.email && ADMIN_EMAILS.includes(currentUser.email));

  // 카테고리 + 검색어로 필터링
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
  };

  const handleRestaurantDeleted = useCallback((restaurantId: string) => {
    setAllRestaurants((prev) => prev.filter((restaurant) => restaurant.id !== restaurantId));
    setSelectedRestaurantId(null);
  }, []);

  const handleEditRestaurant = useCallback((restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setIsEditModalOpen(true);
  }, []);

  return (
    <div className="relative w-full h-[100dvh] bg-gray-50 overflow-hidden">
      <MapView
        restaurants={filteredRestaurants}
        selectedRestaurantId={selectedRestaurantId}
        onSelectRestaurant={setSelectedRestaurantId}
        onMapClick={handleMapClick}
        isBottomCardOpen={isBottomCardOpen}
      />

      <SearchBar onSearch={setSearchQuery} />

      <CategoryScroll selectedCategory={selectedCategory} onSelectCategory={handleCategorySelect} />

      <button
        type="button"
        onClick={() => setShowOnlyFavorites((value) => !value)}
        className={`absolute left-3 top-[132px] z-20 flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm transition-all ${
          showOnlyFavorites ? 'border-red-200 bg-red-50 text-red-500 shadow-red-100' : 'border-gray-200 bg-white/95 text-gray-700 hover:border-orange-200 hover:bg-orange-50'
        }`}
      >
        <Heart size={14} fill={showOnlyFavorites ? 'currentColor' : 'none'} />
        즐겨찾기만 보기
      </button>

      {isLoading && (
        <div className="absolute left-1/2 top-[144px] z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-orange-100 bg-white/95 px-3.5 py-2 text-sm font-medium text-gray-600 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          <Loader2 size={14} className="animate-spin text-primary" />
          맛집을 불러오는 중...
        </div>
      )}

      {/* auth area */}
      <div className="absolute inset-x-3 top-3 z-30 flex items-center justify-end gap-2 sm:justify-end">
        {currentUser ? (
          <div className="inline-flex max-w-[160px] items-center gap-2 overflow-hidden rounded-full border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-700 shadow-sm sm:max-w-[220px]">
            <UserCircle2 size={16} />
            <span className="truncate">{currentUser.email?.split('@')[0] ?? 'User'}</span>
          </div>
        ) : authLoading ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-500 shadow-sm">
            Loading...
          </div>
        ) : null}
        <button
          type="button"
          onClick={currentUser ? handleLogout : handleLogin}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          {currentUser ? <LogOut size={14} /> : <LogIn size={14} />}
          <span>{currentUser ? '로그아웃' : '로그인'}</span>
        </button>
      </div>

      <button
        onClick={() => setIsAddModalOpen(true)}
        className="absolute z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_16px_40px_rgba(249,115,22,0.28)] transition-all active:scale-95"
        style={{
          right: '18px',
          bottom: isBottomCardOpen
            ? 'calc(120px + env(safe-area-inset-bottom, 0px))'
            : 'calc(28px + env(safe-area-inset-bottom, 0px))',
        }}
        aria-label="맛집 등록하기"
        data-testid="button-add-restaurant"
      >
        <Plus size={26} />
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
