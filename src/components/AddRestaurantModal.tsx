import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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
}

const CATEGORY_OPTIONS: Category[] = ['한식', '중식', '일식', '카페', '고기', '양식', '기타'];
const geocodeAddress = (address: string): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    const naver = (window as any).naver;

    if (!naver?.maps?.Service?.geocode) {
      reject(new Error('네이버 Geocoding 모듈이 로드되지 않았습니다.'));
      return;
    }

    naver.maps.Service.geocode({ query: address }, (status: any, response: any) => {
      if (status !== naver.maps.Service.Status.OK) {
        reject(new Error('주소를 좌표로 변환하지 못했습니다. 도로명 주소 또는 지번 주소를 입력해 주세요.'));
        return;
      }

      const item = response.v2?.addresses?.[0];

      if (!item) {
        reject(new Error('주소 검색 결과가 없습니다. 도로명 주소 또는 지번 주소를 입력해 주세요.'));
        return;
      }

      resolve({
        lat: Number(item.y),
        lng: Number(item.x),
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
}: AddRestaurantModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();
  const fieldsDisabled = submitting || uploadingImage || !isSupabaseConfigured;

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
      toast({ variant: 'destructive', title: '업로드 불가', description: 'Supabase 환경이 설정되지 않았습니다.' });
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
      toast({ title: '이미지가 업로드되었습니다', description: '등록/수정 시 바로 반영됩니다.' });
    } catch (error) {
      console.error('[matjip-map] 이미지 업로드 실패', error);
      const message = error instanceof Error ? error.message : '콘솔 오류를 확인해주세요.';
      toast({ variant: 'destructive', title: '이미지 업로드 실패', description: message });
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
        title: '등록 기능을 이용할 수 없습니다',
        description: 'Supabase 설정을 확인한 뒤 다시 시도해주세요.',
      });
      return;
    }

    const price = Number(form.price);

    if (!form.name.trim() || !form.address.trim() || !form.menuName.trim() || !form.shortReview.trim()) {
      toast({
        variant: 'destructive',
        title: '입력값을 확인해주세요',
        description: '식당 이름, 주소, 대표 메뉴, 한 줄 소개는 필수입니다.',
      });
      return;
    }

    if (Number.isNaN(price) || price < 0) {
      toast({
        variant: 'destructive',
        title: '가격을 확인해주세요',
        description: '가격은 0 이상의 숫자로 입력해주세요.',
      });
      return;
    }

    if (form.phone.trim() && !/^\+?[0-9\s()-]{6,20}$/.test(form.phone.trim())) {
      toast({
        variant: 'destructive',
        title: '전화번호를 확인해주세요',
        description: '전화번호는 숫자, 공백, 하이픈, 괄호만 사용해 주세요.',
      });
      return;
    }

    if (!isValidUrl(form.blogReviewUrl)) {
      toast({
        variant: 'destructive',
        title: '블로그 리뷰 URL을 확인해주세요',
        description: '올바른 URL 형식으로 입력해 주세요.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const coords = await geocodeAddress(form.address.trim());

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
          title: '맛집이 수정되었습니다',
          description: `${form.name.trim()}이(가) 수정되었어요.`,
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
      });

      toast({
        title: '맛집이 등록되었습니다',
        description: `${form.name.trim()}이(가) 등록되었어요.`,
      });

      resetForm();
      onOpenChange(false);
      onRegistered(restaurantId);
    } catch (error) {
      console.error('[matjip-map] 식당 등록 실패', error);
      const message = error instanceof Error ? error.message : '콘솔 오류를 확인해주세요.';
      toast({
        variant: 'destructive',
        title: '등록에 실패했습니다',
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] rounded-2xl p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{mode === 'edit' ? '맛집 수정하기' : '맛집 등록하기'}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            도로명 주소 또는 지번 주소를 입력하면 자동으로 좌표를 저장합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restaurant-name">식당 이름</Label>
            <Input
              id="restaurant-name"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="예: 형제육회 본점"
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
              placeholder="예: 서울 종로구 종로 200-1"
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
                placeholder="예: 육회비빔밥"
                disabled={fieldsDisabled}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="restaurant-price">가격 (원)</Label>
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
            <Label htmlFor="restaurant-review">한 줄 소개</Label>
            <Textarea
              id="restaurant-review"
              value={form.shortReview}
              onChange={handleChange('shortReview')}
              placeholder="예: 신선한 육회와 푸짐한 밑반찬이 인상적이에요."
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
                      aria-label={`${value}점`}
                    >
                      <Star size={16} className={isFilled ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-gray-500">{Number(form.rating) || 0}/5</div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="restaurant-image">사진 업로드</Label>
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

          <DialogFooter className="gap-2 sm:gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleClose(false)}
              disabled={submitting}
            >
              취소
            </Button>

            <Button type="submit" className="flex-1" disabled={fieldsDisabled}>
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