import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch?: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onSearch?.(e.target.value);
  };

  const handleClose = () => {
    setIsExpanded(false);
  };

  return (
    <div className="relative z-20 flex shrink-0 items-center justify-end">
      {isExpanded ? (
        <div className="flex w-[min(220px,calc(100vw-8rem))] items-center gap-2 rounded-full border border-orange-200 bg-white/95 px-2 py-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.12)] sm:w-[248px]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-primary">
            <Search size={15} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="검색"
            className="h-8 flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400"
            data-testid="input-search"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleClose();
              }
            }}
          />
          <button
            type="button"
            onClick={handleClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="검색 닫기"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white/95 text-primary shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition active:scale-95"
          aria-label="검색 열기"
        >
          <Search size={16} />
        </button>
      )}
    </div>
  );
}
