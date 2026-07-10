import React, { useEffect, useMemo, useState } from 'react';
import { Category } from '@/lib/mock-data';
import { LayoutGrid, Utensils, UtensilsCrossed, Fish, Coffee, Flame, Sandwich, MoreHorizontal, ChevronDown } from 'lucide-react';

interface CategoryScrollProps {
  selectedCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
}

const CATEGORY_COLORS: Record<Category | '전체', string> = {
  전체: '#f97316',
  한식: '#E53935',
  중식: '#FB8C00',
  일식: '#1E88E5',
  양식: '#8E24AA',
  카페: '#6D4C41',
  고기: '#C62828',
  기타: '#757575',
};

const CATEGORIES: { label: '전체' | Category; icon: React.ReactNode }[] = [
  { label: '전체', icon: <LayoutGrid size={14} /> },
  { label: '한식', icon: <Utensils size={14} /> },
  { label: '중식', icon: <UtensilsCrossed size={14} /> },
  { label: '일식', icon: <Fish size={14} /> },
  { label: '양식', icon: <Sandwich size={14} /> },
  { label: '카페', icon: <Coffee size={14} /> },
  { label: '고기', icon: <Flame size={14} /> },
  { label: '기타', icon: <MoreHorizontal size={14} /> },
];

export default function CategoryScroll({ selectedCategory, onSelectCategory }: CategoryScrollProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => setIsMobile(window.innerWidth < 768);
    update();

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const currentLabel = selectedCategory ?? '전체';
  const currentColor = CATEGORY_COLORS[currentLabel];

  const handleSelect = (label: '전체' | Category) => {
    onSelectCategory(label === '전체' ? null : label);
    if (isMobile) {
      setIsExpanded(false);
    }
  };

  const renderChip = (label: '전체' | Category, isSelected: boolean) => {
    const color = CATEGORY_COLORS[label];
    return (
      <button
        key={label}
        onClick={() => handleSelect(label)}
        className={`flex h-8 items-center gap-1.5 rounded-full border px-2.5 whitespace-nowrap text-[12px] font-semibold transition-all sm:h-9 sm:px-3 sm:text-[13px] ${
          isSelected
            ? 'border-primary bg-primary text-white shadow-[0_6px_18px_rgba(249,115,22,0.2)]'
            : 'border-gray-200 bg-white/90 text-gray-700 shadow-sm hover:border-orange-200 hover:bg-orange-50'
        }`}
        data-testid={`btn-category-${label}`}
      >
        <span className="flex h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span>{label}</span>
      </button>
    );
  };

  const mobileSelector = useMemo(
    () => (
      <div className="relative z-20 w-full md:hidden">
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="flex h-9 w-full items-center justify-between gap-2 rounded-full border border-gray-200 bg-white/95 px-3 text-[13px] font-semibold text-gray-700 shadow-sm"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="flex h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: currentColor }} />
            <span>{currentLabel}</span>
          </span>
          <ChevronDown size={15} className={`shrink-0 transition ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isExpanded ? (
          <div className="mt-2 flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white/95 p-2 shadow-sm">
            {CATEGORIES.map(({ label }) => renderChip(label, label === '전체' ? selectedCategory === null : selectedCategory === label))}
          </div>
        ) : null}
      </div>
    ),
    [currentColor, currentLabel, isExpanded, selectedCategory],
  );

  return (
    <div className="relative z-20 w-full">
      {mobileSelector}
      <div className="hidden min-w-full gap-2 overflow-x-auto px-1 py-1 md:flex md:items-center">
        {CATEGORIES.map(({ label }) => renderChip(label, label === '전체' ? selectedCategory === null : selectedCategory === label))}
      </div>
    </div>
  );
}
