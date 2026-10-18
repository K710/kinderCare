import { Search, X } from 'lucide-react';
import { Input } from './Input.jsx';

// Ô tìm kiếm có icon và nút xoá
export function SearchInput({ value, onChange, placeholder = 'Tìm kiếm…', className }) {
  return (
    <div className={`relative ${className || ''}`}>
      <Search size={18} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-ink-soft" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputClassName="pl-10"
        aria-label={placeholder}
        rightSlot={
          value ? (
            <button type="button" onClick={() => onChange('')} className="touch flex items-center justify-center text-ink-soft hover:text-ink" aria-label="Xoá tìm kiếm">
              <X size={18} />
            </button>
          ) : null
        }
      />
    </div>
  );
}
