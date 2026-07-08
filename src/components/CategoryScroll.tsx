import React from 'react';
import { Category } from '@/lib/mock-data';
import { LayoutGrid, Utensils, UtensilsCrossed, Fish, Coffee, Flame, Sandwich, MoreHorizontal } from 'lucide-react';

interface CategoryScrollProps {
  selectedCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
}

const CATEGORIES: { label: '전체' | Category; icon: React.ReactNode }[] = [
  { label: '전체', icon: <LayoutGrid size={16} /> },
  { label: '한식', icon: <Utensils size={16} /> },
  { label: '중식', icon: <UtensilsCrossed size={16} /> },
  { label: '일식', icon: <Fish size={16} /> },
  { label: '양식', icon: <Sandwich size={16} /> },
  { label: '카페', icon: <Coffee size={16} /> },
  { label: '고기', icon: <Flame size={16} /> },
  { label: '기타', icon: <MoreHorizontal size={16} /> },
];

export default function CategoryScroll({ selectedCategory, onSelectCategory }: CategoryScrollProps) {
  return (
    <div className="absolute top-[78px] left-0 w-full z-20">
      <div className="flex overflow-x-auto gap-2 px-3 py-2.5 no-scrollbar">
        {CATEGORIES.map(({ label, icon }) => {
          const isSelected = label === '전체' ? selectedCategory === null : selectedCategory === label;
          return (
            <button
              key={label}
              onClick={() => onSelectCategory(label === '전체' ? null : label)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 whitespace-nowrap text-[13px] font-semibold transition-all ${
                isSelected
                  ? 'border-primary bg-primary text-white shadow-[0_8px_24px_rgba(249,115,22,0.25)]'
                  : 'border-gray-200 bg-white/90 text-gray-700 shadow-sm hover:border-orange-200 hover:bg-orange-50'
              }`}
              data-testid={`btn-category-${label}`}
            >
              <span className={isSelected ? 'opacity-90' : 'text-gray-500'}>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
