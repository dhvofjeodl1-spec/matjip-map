import React, { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';

interface SearchBarProps {
  onSearch?: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <div className="absolute inset-x-3 top-3 z-20">
      <div className="rounded-[22px] border border-orange-100 bg-white/95 px-3 py-2.5 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
        <div className="flex items-center gap-2 rounded-full bg-orange-50/80 px-3 py-2.5 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles size={16} />
          </div>
          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="맛집 이름, 메뉴, 주소로 검색"
            className="flex-1 bg-transparent text-[15px] font-medium text-gray-800 outline-none placeholder:text-gray-400"
            data-testid="input-search"
          />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-sm">
            <Search size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
