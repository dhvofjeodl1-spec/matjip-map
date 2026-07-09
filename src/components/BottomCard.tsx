import React, { useEffect, useMemo, useState } from 'react';
import { Restaurant } from '@/lib/mock-data';
import { approveRestaurant, deleteRestaurant } from '@/lib/restaurants';
import { Star, MapPin, Navigation, Clock, BookOpen, Phone, X, Trash2, Pencil, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface BottomCardProps {
  restaurant: Restaurant | null;
  currentUser?: { id: string; email: string | null } | null;
  onClose?: () => void;
  onDelete?: (restaurantId: string) => void;
  onEdit?: (restaurant: Restaurant) => void;
  onApprove?: () => void;
}

type RestaurantWithOptionalContact = Restaurant & {
  phone?: string;
  businessHours?: string;
};

type LocalReview = {
  text: string;
  rating: number;
  createdAt: string;
};

const DEFAULT_IMAGE_URL = '';

function formatPrice(price: number) {
  return `${price.toLocaleString()}원`;
}

function formatReviewDate(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function readRestaurantReviews(restaurantId: string): LocalReview[] {
  try {
    const storedReviews = localStorage.getItem(`reviews-${restaurantId}`);
    if (!storedReviews) return [];

    const parsed = JSON.parse(storedReviews) as Array<string | LocalReview>;
    return parsed.map((item) => {
      if (typeof item === 'string') {
        return { text: item, rating: 5, createdAt: new Date().toISOString() };
      }
      return {
        text: item.text ?? '',
        rating: Math.max(1, Math.min(5, Number(item.rating) || 5)),
        createdAt: item.createdAt ?? new Date().toISOString(),
      };
    }).filter((review) => review.text.trim().length > 0);
  } catch {
    return [];
  }
}

function writeRestaurantReviews(restaurantId: string, reviews: LocalReview[]) {
  localStorage.setItem(`reviews-${restaurantId}`, JSON.stringify(reviews));
}

export default function BottomCard({ restaurant, currentUser, onClose, onDelete, onEdit, onApprove }: BottomCardProps) {
  if (!restaurant) {
    return null;
  }

  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviews, setReviews] = useState<LocalReview[]>([]);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const contactInfo = restaurant as RestaurantWithOptionalContact;
  const isOwner = Boolean(currentUser?.id && restaurant.ownerId === currentUser.id);
  const isAdmin = Boolean(currentUser?.email === 'dhvofjeodl1@gmail.com');
  const canEditDelete = isOwner || isAdmin;
  const showApprovalControls = isAdmin && restaurant.isApproved === false;
  const primaryMenu = restaurant.menu?.[0];
  const additionalMenus = restaurant.menu?.slice(1) ?? [];
  const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(restaurant.address)}`;
  const blogReviewUrl = restaurant.blogReviewUrl || `https://search.naver.com/search.naver?where=post&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`;

  useEffect(() => {
    const storedFavorites = localStorage.getItem('favorite-restaurants');
    if (storedFavorites) {
      const favoriteIds = JSON.parse(storedFavorites) as string[];
      setIsFavorite(favoriteIds.includes(restaurant.id));
    }

    setReviews(readRestaurantReviews(restaurant.id));
  }, [restaurant.id]);

  const ratingStars = useMemo(() => Array.from({ length: 5 }, (_, index) => index < Math.round(restaurant.rating)), [restaurant.rating]);
  const hasImage = Boolean(restaurant.imageUrl && restaurant.imageUrl.trim() && restaurant.imageUrl !== DEFAULT_IMAGE_URL);

  const handleFavoriteToggle = () => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorite-restaurants') || '[]') as string[];
    const nextFavorites = isFavorite
      ? storedFavorites.filter((id) => id !== restaurant.id)
      : [...storedFavorites, restaurant.id];
    localStorage.setItem('favorite-restaurants', JSON.stringify(nextFavorites));
    setIsFavorite(!isFavorite);
    window.dispatchEvent(new Event('favorites-updated'));
  };

  const handleReviewSubmit = () => {
    const trimmed = reviewText.trim();
    if (!trimmed) return;

    const nextReviews = [
      ...reviews,
      {
        text: trimmed,
        rating: reviewRating,
        createdAt: new Date().toISOString(),
      },
    ];

    setReviews(nextReviews);
    writeRestaurantReviews(restaurant.id, nextReviews);
    setReviewText('');
    setReviewRating(5);
  };

  const handleDelete = async () => {
    try {
      await deleteRestaurant(restaurant.id);
      toast({ title: '삭제되었습니다', description: `${restaurant.name}이(가) 목록에서 제거되었습니다.` });
      onDelete?.(restaurant.id);
      onClose?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      console.error('[matjip-map] 식당 삭제 실패', error);
      toast({ variant: 'destructive', title: '삭제에 실패했습니다', description: errorMessage });
    }
  };

  const handleEdit = () => {
    onEdit?.(restaurant);
  };

  const handleApprove = async () => {
    try {
      await approveRestaurant(restaurant.id);
      toast({ title: '승인되었습니다', description: `${restaurant.name}이(가) 승인되었습니다.` });
      onApprove?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      console.error('[matjip-map] 승인 실패', error);
      toast({ variant: 'destructive', title: '승인에 실패했습니다', description: errorMessage });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute left-3 right-3 z-30 max-h-[74dvh] overflow-y-auto px-1 pb-1"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        data-testid="bottom-card"
      >
        <div className="flex flex-col overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
          <div className="relative h-40 w-full shrink-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-300">
            {hasImage ? (
              <button
                type="button"
                onClick={() => setIsImagePreviewOpen(true)}
                className="block h-full w-full text-left"
                aria-label="이미지 크게 보기"
              >
                <img src={restaurant.imageUrl} alt={restaurant.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              </button>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-t from-gray-700/40 via-gray-400/20 to-transparent" />
            )}
            {restaurant.category ? (
              <div className="absolute top-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-700 shadow-sm">
                {restaurant.category}
              </div>
            ) : null}
            <div className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-white/90 p-1.5 shadow-sm">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                aria-label="닫기"
              >
                <X size={16} />
              </button>
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-white drop-shadow-sm">{restaurant.name}</h2>
                <div className="space-x-2">
                  <span className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-gray-700 shadow-sm">
                    {restaurant.isOpen ? '영업 중' : '영업 종료'}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${restaurant.isApproved ? 'bg-emerald-500 text-white' : 'bg-yellow-500 text-white'}`}>
                    {restaurant.isApproved ? '승인됨' : '승인대기'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2 text-[14px]">
              <div className="flex items-center gap-2">
                <div className="flex items-center font-bold text-primary">
                  <Star size={14} className="mr-0.5 fill-current" />
                  {restaurant.rating.toFixed(1)}
                </div>
                <span className="text-gray-400">·</span>
                <span className="text-gray-600">리뷰 {restaurant.reviewCount.toLocaleString()}</span>
              </div>
              <button
                type="button"
                onClick={handleFavoriteToggle}
                className={`rounded-full p-2.5 transition-all ${isFavorite ? 'bg-red-50 text-red-500 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-500'}`}
                aria-label="즐겨찾기"
              >
                <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="flex items-center gap-1 text-sm text-amber-500">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;
                const isFilled = value <= Math.round(restaurant.rating);
                return <Star key={`${restaurant.id}-${index}`} size={16} className={isFilled ? 'fill-current' : 'text-gray-300'} />;
              })}
              <span className="ml-1 text-xs font-medium text-gray-500">{Math.round(restaurant.rating)}/5</span>
            </div>

            {primaryMenu ? (
              <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700">대표 메뉴</span>
                  <span className="text-xs font-semibold text-primary">{formatPrice(primaryMenu.price)}</span>
                </div>
                <div className="text-sm text-gray-800">
                  <div className="font-semibold text-gray-900">{primaryMenu.name}</div>
                  {additionalMenus.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      추가 메뉴: {additionalMenus.map((item) => item.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {restaurant.shortReview ? (
              <p className="rounded-2xl border border-gray-100 bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-700 shadow-sm">
                “{restaurant.shortReview}”
              </p>
            ) : null}

            {restaurant.address ? (
              <div className="flex items-start gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
                <MapPin size={16} className="mt-0.5 shrink-0 text-gray-400" />
                <span>{restaurant.address}</span>
              </div>
            ) : null}

            {contactInfo.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={16} className="shrink-0 text-gray-400" />
                <span>{contactInfo.phone}</span>
              </div>
            )}

            {contactInfo.businessHours && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={16} className="shrink-0 text-gray-400" />
                <span>{contactInfo.businessHours}</span>
              </div>
            )}

            {restaurant.tags?.length ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {restaurant.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-orange-50 px-2.5 py-1 text-[12px] font-medium text-primary">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
              {canEditDelete ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-[14px] font-semibold text-gray-700 transition-colors active:bg-gray-50"
                  >
                    <Pencil size={16} />
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-[14px] font-semibold text-red-600 transition-colors active:bg-red-100"
                  >
                    <Trash2 size={16} />
                    삭제
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 text-center text-sm text-gray-500">
                  이 식당의 수정/삭제 권한이 없습니다.
                </div>
              )}

              {showApprovalControls && (
                <button
                  type="button"
                  onClick={handleApprove}
                  className="w-full rounded-2xl bg-emerald-600 px-3 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                >
                  승인
                </button>
              )}
              {restaurant.ownerEmail ? (
                <div className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
                  등록자: {restaurant.ownerEmail}
                </div>
              ) : null}
            </div>

            <div className="flex gap-2">
              <a
                href={naverMapUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-blue-50 px-3 py-2.5 text-[14px] font-semibold text-blue-600 transition-colors active:bg-blue-100"
              >
                <Navigation size={16} />
                네이버 지도 열기
              </a>

              <a
                href={blogReviewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary px-3 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-primary/20 transition-colors active:bg-orange-600"
              >
                <BookOpen size={16} />
                블로그 리뷰 보기
              </a>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <div className="mb-2 text-sm font-semibold text-gray-700">리뷰 남기기</div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="짧은 후기를 남겨보세요."
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                rows={2}
              />
              <div className="mt-2 flex items-center gap-1">
                {Array.from({ length: 5 }, (_, index) => {
                  const value = index + 1;
                  const isSelected = value <= reviewRating;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReviewRating(value)}
                      className="rounded-full p-1"
                      aria-label={`${value}점`}
                    >
                      <Star size={16} className={isSelected ? 'fill-current text-amber-500' : 'text-gray-300'} />
                    </button>
                  );
                })}
                <span className="ml-1 text-xs font-medium text-gray-500">{reviewRating}/5</span>
              </div>
              <button
                type="button"
                onClick={handleReviewSubmit}
                className="mt-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm"
              >
                등록
              </button>
              {reviews.length > 0 && (
                <div className="mt-3 space-y-2">
                  {reviews.map((review, index) => (
                    <div key={`${restaurant.id}-${index}`} className="rounded-lg bg-white px-3 py-2 text-sm text-gray-600">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }, (_, starIndex) => {
                            const value = starIndex + 1;
                            return <Star key={starIndex} size={12} className={value <= review.rating ? 'fill-current text-amber-500' : 'text-gray-300'} />;
                          })}
                        </div>
                        <span className="text-[11px] text-gray-400">{formatReviewDate(review.createdAt)}</span>
                      </div>
                      <div className="mt-2 leading-relaxed">{review.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isImagePreviewOpen && hasImage ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3"
          >
            <div className="relative w-full max-w-3xl rounded-2xl bg-white p-2 shadow-2xl">
              <button
                type="button"
                onClick={() => setIsImagePreviewOpen(false)}
                className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white"
                aria-label="이미지 닫기"
              >
                <X size={18} />
              </button>
              <img src={restaurant.imageUrl} alt={restaurant.name} className="max-h-[80dvh] w-full rounded-xl object-contain" />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AnimatePresence>
  );
}
