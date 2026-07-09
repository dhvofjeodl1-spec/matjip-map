import React, { useState, useMemo, useEffect, useCallback } from 'react';
import MapView from '@/components/MapView';
import SearchBar from '@/components/SearchBar';
import CategoryScroll from '@/components/CategoryScroll';
import BottomCard from '@/components/BottomCard';
import AddRestaurantModal from '@/components/AddRestaurantModal';
import { Category, Restaurant } from '@/lib/mock-data';
import { fetchAllRestaurants } from '@/lib/restaurants';
import { Plus, Loader2, Heart } from 'lucide-react';

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

  const loadRestaurants = useCallback(async () => {
    setIsLoading(true);
    try {
      const restaurants = await fetchAllRestaurants();
      setAllRestaurants(restaurants);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

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

  // 카테고리 + 검색어로 필터링
  const filteredRestaurants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allRestaurants.filter((restaurant) => {
      if (restaurant.isApproved === false) {
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

      {/* 맛집 등록 플로팅 버튼 */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="absolute right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_16px_40px_rgba(249,115,22,0.28)] transition-all active:scale-95"
        style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label="맛집 등록하기"
        data-testid="button-add-restaurant"
      >
        <Plus size={26} />
      </button>

      <BottomCard
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurantId(null)}
        onDelete={handleRestaurantDeleted}
        onEdit={handleEditRestaurant}
      />

      <AddRestaurantModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onRegistered={handleRestaurantSaved}
      />

      <AddRestaurantModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onRegistered={handleRestaurantSaved}
        mode="edit"
        restaurant={editingRestaurant}
      />
    </div>
  );
}
