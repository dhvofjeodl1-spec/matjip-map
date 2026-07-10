import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, isAdminEmail } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Category, Restaurant } from '@/lib/mock-data';
import { addRestaurant, updateRestaurant } from '@/lib/restaurants';

interface AddRestaurantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: (restaurantId?: string) => void;
  mode?: 'create' | 'edit';
  restaurant?: Restaurant | null;
  currentUser?: { id: string; email: string | null } | null;
}

const CATEGORY_OPTIONS: Category[] = ['한식', '중식', '일식', '양식', '카페', '고기', '기타'];
interface GeocodeResult {
  lat: number;
  lng: number;
  roadAddress: string;
  jibunAddress: string;
  address: string;
}

const normalizeAddress = (value: string): string => {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^0-9a-zA-Z\uAC00-\uD7A3\s]/g, '')
    .toLowerCase();
};

const geocodeAddress = (address: string): Promise<GeocodeResult> => {
  return new Promise((resolve, reject) => {
    const naver = (window as any).naver;

    if (!naver?.maps?.Service?.geocode) {
      reject(new Error('?ㅼ씠踰?Geocoding 紐⑤뱢??濡쒕뱶?섏? ?딆븯?듬땲??'));
      return;
    }

    naver.maps.Service.geocode({ query: address }, (status: any, response: any) => {
      if (status !== naver.maps.Service.Status.OK) {
        reject(new Error('二쇱냼瑜?醫뚰몴濡?蹂?섑븯吏 紐삵뻽?듬땲?? ?꾨줈紐?二쇱냼 ?먮뒗 吏踰?二쇱냼瑜??낅젰??二쇱꽭??'));
        return;
      }

      const item = response.v2?.addresses?.[0];

      if (!item) {
        reject(new Error('二쇱냼 寃??寃곌낵媛 ?놁뒿?덈떎. ?꾨줈紐?二쇱냼 ?먮뒗 吏踰?二쇱냼瑜??낅젰??二쇱꽭??'));
        return;
      }

      resolve({
        lat: Number(item.y),
        lng: Number(item.x),
        roadAddress: item.roadAddress ?? '',
        jibunAddress: item.jibunAddress ?? '',
        address: item.address ?? item.roadAddress ?? item.jibunAddress ?? '',
      });
    });
  });
};
const EMPTY_FORM = {
  name: '',
  address: '',
  category: '한식' as Category,
  menuName: '',
  price: '',
  shortReview: '',
  phone: '',
  blogReviewUrl: '',
  rating: '0',
  imageUrl: '',
};

export default function AddRestaurantModal({
  open,
  onOpenChange,
  onRegistered,
  mode = 'create',
  restaurant = null,
  currentUser = null,
}: AddRestaurantModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();
  const fieldsDisabled = submitting || uploadingImage || !isSupabaseConfigured || (!currentUser && mode === 'create');

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && restaurant) {
      setForm({
        name: restaurant.name || '',
        address: restaurant.address || '',
        category: restaurant.category || '한식',
        menuName: restaurant.menu?.[0]?.name || '',
        price: restaurant.menu?.[0]?.price?.toString() || '',
        shortReview: restaurant.shortReview || '',
        phone: restaurant.phone || '',
        blogReviewUrl: restaurant.blogReviewUrl || '',
        rating: restaurant.rating?.toString() || '0',
        imageUrl: restaurant.imageUrl || '',
      });
      return;
    }

    setForm(EMPTY_FORM);
  }, [open, mode, restaurant]);

  const resetForm = () => setForm(EMPTY_FORM);

  const handleClose = (nextOpen: boolean) => {
    if (!submitting) {
      onOpenChange(nextOpen);
      if (!nextOpen) resetForm();
    }
  };

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleRatingSelect = (value: number) => {
    setForm((prev) => ({ ...prev, rating: String(value) }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSupabaseConfigured || !supabase) {
      toast({ variant: 'destructive', title: '?낅줈??遺덇?', description: 'Supabase ?섍꼍???ㅼ젙?섏? ?딆븯?듬땲??' });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('restaurant-images').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('restaurant-images').getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, imageUrl: data.publicUrl }));
      toast({ title: '?대?吏媛 ?낅줈?쒕릺?덉뒿?덈떎', description: '?깅줉/?섏젙 ??諛붾줈 諛섏쁺?⑸땲??' });
    } catch (error) {
      console.error('[matjip-map] ?대?吏 ?낅줈???ㅽ뙣', error);
      const message = error instanceof Error ? error.message : '肄섏넄 ?ㅻ쪟瑜??뺤씤?댁＜?몄슂.';
      toast({ variant: 'destructive', title: '?대?吏 ?낅줈???ㅽ뙣', description: message });
    } finally {
      setUploadingImage(false);
    }
  };

  const isValidUrl = (value: string) => {
    if (!value.trim()) return true;

    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      toast({
        variant: 'destructive',
        title: 'Supabase가 설정되지 않았습니다.',
        description: 'Supabase가 설정되어 있지 않아 등록할 수 없습니다.',
      });
      return;
    }

    if (mode === 'create' && !currentUser) {
      toast({
        variant: 'destructive',
        title: '로그인 필요',
        description: '로그인 후 맛집을 등록할 수 있습니다.',
      });
      return;
    }

    const price = Number(form.price);

    if (!form.name.trim() || !form.address.trim() || !form.menuName.trim() || !form.shortReview.trim()) {
      toast({
        variant: 'destructive',
        title: '?낅젰媛믪쓣 ?뺤씤?댁＜?몄슂',
        description: '?앸떦 ?대쫫, 二쇱냼, ???硫붾돱, ??以??뚭컻???꾩닔?낅땲??',
      });
      return;
    }

    if (Number.isNaN(price) || price < 0) {
      toast({
        variant: 'destructive',
        title: '媛寃⑹쓣 ?뺤씤?댁＜?몄슂',
        description: '媛寃⑹? 0 ?댁긽???レ옄濡??낅젰?댁＜?몄슂.',
      });
      return;
    }

    if (form.phone.trim() && !/^\+?[0-9\s()-]{6,20}$/.test(form.phone.trim())) {
      toast({
        variant: 'destructive',
        title: '?꾪솕踰덊샇瑜??뺤씤?댁＜?몄슂',
        description: '?꾪솕踰덊샇???レ옄, 怨듬갚, ?섏씠?? 愿꾪샇留??ъ슜??二쇱꽭??',
      });
      return;
    }

    if (!isValidUrl(form.blogReviewUrl)) {
      toast({
        variant: 'destructive',
        title: '釉붾줈洹?由щ럭 URL???뺤씤?댁＜?몄슂',
        description: '?щ컮瑜?URL ?뺤떇?쇰줈 ?낅젰??二쇱꽭??',
      });
      return;
    }

    setSubmitting(true);
    try {
      const coords = await geocodeAddress(form.address.trim());
      const normalizedInput = normalizeAddress(form.address.trim());
      const normalizedRoadAddress = normalizeAddress(coords.roadAddress);
      const normalizedJibunAddress = normalizeAddress(coords.jibunAddress);
      const normalizedGeocodedAddress = normalizeAddress(coords.address);

      if (mode === 'create') {
        const { data: existingRestaurants, error: existingRestaurantsError } = await supabase
          .from('restaurants')
          .select('address');

        if (existingRestaurantsError) {
          throw existingRestaurantsError;
        }

        const hasDuplicate = (existingRestaurants ?? []).some((row: { address?: string }) => {
          const existingAddress = normalizeAddress(row.address ?? '');
          return (
            existingAddress === normalizedRoadAddress ||
            existingAddress === normalizedJibunAddress ||
            existingAddress === normalizedGeocodedAddress ||
            existingAddress === normalizedInput
          );
        });

        if (hasDuplicate) {
          toast({
            variant: 'destructive',
            title: '?대? 媛숈? 二쇱냼濡??깅줉??留쏆쭛???덉뒿?덈떎.',
          });
          return;
        }
      }

      if (mode === 'edit' && restaurant?.id) {
        await updateRestaurant({
          id: restaurant.id,
          name: form.name.trim(),
          address: form.address.trim(),
          category: form.category,
          menuName: form.menuName.trim(),
          price,
          shortReview: form.shortReview.trim(),
          lat: coords.lat,
          lng: coords.lng,
          phone: form.phone.trim(),
          blogReviewUrl: form.blogReviewUrl.trim(),
          imageUrl: form.imageUrl.trim(),
          rating: Number(form.rating),
        });

        toast({
          title: 'Restaurant updated successfully',
          description: `${form.name.trim()} has been updated.`,
        });

        resetForm();
        onOpenChange(false);
        onRegistered(restaurant.id);
        return;
      }

      const restaurantId = await addRestaurant({
        name: form.name.trim(),
        address: form.address.trim(),
        category: form.category,
        menuName: form.menuName.trim(),
        price,
        shortReview: form.shortReview.trim(),
        lat: coords.lat,
        lng: coords.lng,
        phone: form.phone.trim(),
        blogReviewUrl: form.blogReviewUrl.trim(),
        imageUrl: form.imageUrl.trim(),
        rating: Number(form.rating),
        ownerId: currentUser?.id,
        ownerEmail: currentUser?.email ?? null,
        isApproved: isAdminEmail(currentUser?.email),
      });

      toast({
        title: 'Restaurant registered successfully',
        description: `${form.name.trim()} has been registered.`,
      });

      resetForm();
      onOpenChange(false);
      onRegistered(restaurantId);
    } catch (error) {
      console.error('[matjip-map] ?앸떦 ?깅줉 ?ㅽ뙣', error);
      const message = error instanceof Error ? error.message : '肄섏넄 ?ㅻ쪟瑜??뺤씤?댁＜?몄슂.';
      toast({
        variant: 'destructive',
        title: '?깅줉???ㅽ뙣?덉뒿?덈떎',
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] rounded-2xl p-4 sm:p-5 max-h-[90dvh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{mode === 'edit' ? '맛집 수정하기' : '맛집 등록하기'}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            정확한 주소를 입력하시면 위치를 찾아 등록할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto pb-2 pr-1 max-h-[72dvh] sm:max-h-[76dvh]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restaurant-name">맛집 이름</Label>
            <Input
              id="restaurant-name"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="예: 갈비찜"
              disabled={fieldsDisabled}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restaurant-address">주소</Label>
            <Input
              id="restaurant-address"
              value={form.address}
              onChange={handleChange('address')}
              placeholder="예: 서울시 강남구 테헤란로 200-1"
              disabled={fieldsDisabled}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restaurant-category">카테고리</Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm((prev) => ({ ...prev, category: value as Category }))}
              disabled={fieldsDisabled}
            >
              <SelectTrigger id="restaurant-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="restaurant-menu">대표 메뉴</Label>
              <Input
                id="restaurant-menu"
                value={form.menuName}
                onChange={handleChange('menuName')}
                placeholder="예: 아메리카노"
                disabled={fieldsDisabled}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="restaurant-price">가격(원)</Label>
              <Input
                id="restaurant-price"
                type="number"
                min={0}
                value={form.price}
                onChange={handleChange('price')}
                placeholder="예: 12000"
                disabled={fieldsDisabled}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restaurant-review">한 줄 후기</Label>
            <Textarea
              id="restaurant-review"
              value={form.shortReview}
              onChange={handleChange('shortReview')}
              placeholder="예: 국물이 진하고 깔끔했어요."
              disabled={fieldsDisabled}
              required
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="restaurant-rating">평점</Label>
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2">
                {Array.from({ length: 5 }, (_, index) => {
                  const value = index + 1;
                  const isFilled = Number(form.rating) >= value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatingSelect(value)}
                      className="p-0.5"
                      disabled={fieldsDisabled}
                      aria-label={`${value} stars`}
                    >
                      <Star size={16} className={isFilled ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-gray-500">{Number(form.rating) || 0}/5</div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="restaurant-image">이미지 업로드</Label>
              <Input id="restaurant-image" type="file" accept="image/*" onChange={handleImageUpload} disabled={fieldsDisabled} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="restaurant-phone">전화번호</Label>
              <Input
                id="restaurant-phone"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="예: 02-1234-5678"
                disabled={fieldsDisabled}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="restaurant-blog-url">블로그 리뷰 URL</Label>
              <Input
                id="restaurant-blog-url"
                type="url"
                value={form.blogReviewUrl}
                onChange={handleChange('blogReviewUrl')}
                placeholder="https://blog.example.com/post"
                disabled={fieldsDisabled}
              />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 pt-1 sm:flex-row sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 rounded-xl"
              onClick={() => handleClose(false)}
              disabled={submitting}
            >
              취소
            </Button>

            <Button type="submit" className="h-10 flex-1 rounded-xl" disabled={fieldsDisabled}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {mode === 'edit' ? '수정 중...' : '등록 중...'}
                </>
              ) : (
                mode === 'edit' ? '수정하기' : '등록하기'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
