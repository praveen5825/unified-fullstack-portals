import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export default function CustomDropdown({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select...", 
  searchable = false,
  icon: Icon
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on search
  const filteredOptions = options.filter(opt => {
    if (opt.group) return true; // Keep groups, we'll filter their items or hide empty groups later
    return opt.label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Handle option selection
  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm(''); // Reset search
  };

  // Find the selected option to display its label
  let selectedLabel = placeholder;
  for (const opt of options) {
    if (opt.group) {
      const found = opt.items.find(i => i.value === value);
      if (found) {
        selectedLabel = found.label;
        break;
      }
    } else if (opt.value === value) {
      selectedLabel = opt.label;
      break;
    }
  }

  // Render options recursively (handling groups)
  const renderOptions = (opts) => {
    return opts.map((opt, index) => {
      if (opt.group) {
        const groupItems = opt.items.filter(item => 
          item.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (groupItems.length === 0) return null;

        return (
          <div key={`group-${index}`} className="mb-2">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-faint bg-surface-2/50 sticky top-0 backdrop-blur-sm z-10">
              {opt.group}
            </div>
            {renderOptions(groupItems)}
          </div>
        );
      }

      const isSelected = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => handleSelect(opt.value)}
          className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors duration-150
            ${isSelected 
              ? 'bg-accent-soft text-accent font-semibold' 
              : 'text-text-primary hover:bg-surface-3'
            }
          `}
        >
          <div className="flex items-center gap-2">
            {opt.icon && <opt.icon size={14} className={isSelected ? 'text-accent' : 'text-text-muted'} />}
            <span>{opt.label}</span>
          </div>
          {isSelected && <Check size={14} className="text-accent" />}
        </button>
      );
    });
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-surface-2 border px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200
          ${isOpen ? 'border-accent shadow-[0_0_0_3px_var(--color-accent-soft)]' : 'border-border-soft hover:border-text-faint'}
        `}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && <Icon size={16} className="text-text-muted shrink-0" />}
          <span className={`truncate ${!value ? 'text-text-faint' : 'text-text-primary font-medium'}`}>
            {selectedLabel}
          </span>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-surface border border-border-soft rounded-xl shadow-lg overflow-hidden animate-fade-in origin-top">
          {/* Search Bar */}
          {searchable && (
            <div className="p-2 border-b border-border-soft bg-surface-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-surface border border-border-soft rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:border-accent transition-colors text-text-primary"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-center text-text-muted">
                No results found
              </div>
            ) : (
              renderOptions(options)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
