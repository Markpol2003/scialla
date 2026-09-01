import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X, ArrowLeft } from 'lucide-react';

const SHORT_DESKTOP_LABELS = {
  coffee: 'Coffee',
  'Coffee Drinks': 'Coffee',
  noncoffee: 'Non-Coffee',
  'Non-Coffee Drinks': 'Non-Coffee',
  soda: 'Refreshers',
  'Soda & Refreshers': 'Refreshers',
  ricemeals: 'Rice Meals',
  'Rice Meals': 'Rice Meals',
  waffles: 'Waffles',
  pasta: 'Pasta',
  pikapika: 'Snacks',
  'Pika-Pika (Snacks)': 'Snacks',
  pizza: 'Pizza'
};

const getDesktopLabel = (cat) => {
  return SHORT_DESKTOP_LABELS[cat.id] || SHORT_DESKTOP_LABELS[cat.category] || cat.category;
};

// Categories moved into More ▾ dropdown on desktop
const MORE_CATEGORY_IDS = new Set(['quesadilla', 'sandwiches', 'drinkaddons', 'foodaddons']);

export default function CategoryFilterBar({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery = '',
  onSearchChange
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(Boolean(searchQuery));
  const dropdownRef = useRef(null);
  const moreDropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Focus search input when mobile search is activated
  useEffect(() => {
    if (isMobileSearchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isMobileSearchActive]);

  // Close dropdowns on outside click and Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target)) {
        setIsMoreDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsMoreDropdownOpen(false);
      }
    };
    if (isDropdownOpen || isMoreDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen, isMoreDropdownOpen]);

  const activeCategoryObj = categories.find(
    (c) => c.id === selectedCategory || c.category === selectedCategory
  );

  const selectedLabel = selectedCategory === 'all'
    ? 'All Categories'
    : activeCategoryObj?.category || 'Category';

  const directCategories = categories.filter(
    (cat) => !MORE_CATEGORY_IDS.has(String(cat.id || '').toLowerCase())
  );

  const moreCategories = categories.filter(
    (cat) => MORE_CATEGORY_IDS.has(String(cat.id || '').toLowerCase())
  );

  const selectedInMore = moreCategories.find(
    (cat) => cat.id === selectedCategory || cat.category === selectedCategory
  );

  return (
    <div className="scialla-category-nav-wrapper">
      {/* MOBILE ACTIVE SEARCH ROW */}
      {isMobileSearchActive ? (
        <div className="mobile-search-active-row">
          <button
            type="button"
            className="btn-close-search"
            onClick={() => {
              setIsMobileSearchActive(false);
              onSearchChange('');
            }}
            aria-label="Close search"
            title="Back to categories"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="category-filter-search-box expanded-search-box">
            <Search size={14} className="search-input-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search menu..."
              className="category-filter-search-input"
              aria-label="Search menu items"
            />
            {searchQuery && (
              <button
                type="button"
                className="category-filter-search-clear"
                onClick={() => onSearchChange('')}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* NORMAL TOOLBAR ROW (Desktop Category Chips & Mobile Dropdown) */
        <div className="scialla-toolbar-row">
          {/* DESKTOP DIRECT CATEGORY NAVIGATION CHIPS (SINGLE ROW + MORE) */}
          <div className="desktop-category-nav-list" role="tablist" aria-label="Menu categories">
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'all'}
              className={`desktop-cat-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => onSelectCategory('all')}
            >
              All
            </button>
            {directCategories.map((cat) => {
              const isSelected = selectedCategory === cat.id || selectedCategory === cat.category;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`desktop-cat-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectCategory(cat.id)}
                >
                  {getDesktopLabel(cat)}
                </button>
              );
            })}

            {/* MORE CATEGORIES DROPDOWN */}
            {moreCategories.length > 0 && (
              <div className="desktop-more-dropdown-container" ref={moreDropdownRef}>
                <button
                  type="button"
                  role="button"
                  aria-haspopup="menu"
                  aria-expanded={isMoreDropdownOpen}
                  aria-selected={Boolean(selectedInMore)}
                  className={`desktop-cat-btn desktop-more-btn ${selectedInMore ? 'active' : ''} ${isMoreDropdownOpen ? 'open' : ''}`}
                  onClick={() => setIsMoreDropdownOpen((prev) => !prev)}
                  title="More categories"
                >
                  <span>{selectedInMore ? selectedInMore.category : 'More'}</span>
                  <ChevronDown size={13} className={`more-arrow-icon ${isMoreDropdownOpen ? 'rotated' : ''}`} />
                </button>

                {isMoreDropdownOpen && (
                  <div className="desktop-more-popover" role="menu">
                    {moreCategories.map((cat) => {
                      const isSelected = selectedCategory === cat.id || selectedCategory === cat.category;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          role="menuitem"
                          className={`desktop-more-item ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            onSelectCategory(cat.id);
                            setIsMoreDropdownOpen(false);
                          }}
                        >
                          <span className="desktop-more-item-name">{cat.category}</span>
                          {isSelected && (
                            <span className="desktop-more-item-check">
                              <Check size={13} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TABLET / MOBILE CATEGORY DROPDOWN */}
          <div className="category-dropdown-container mobile-only-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className={`category-dropdown-btn ${isDropdownOpen ? 'open' : ''} ${selectedCategory !== 'all' ? 'has-filter' : ''}`}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              aria-label="Filter menu by category"
              title="Filter by category"
            >
              <span className="dropdown-btn-text">{selectedLabel}</span>
              <span className={`dropdown-btn-arrow ${isDropdownOpen ? 'rotated' : ''}`}>
                <ChevronDown size={14} />
              </span>
            </button>

            {/* FLOATING COMPACT DROPDOWN POPOVER */}
            {isDropdownOpen && (
              <div className="category-dropdown-menu" role="menu">
                <div className="category-dropdown-list">
                  {/* All Categories Option */}
                  <button
                    type="button"
                    role="menuitem"
                    className={`category-dropdown-item ${selectedCategory === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      onSelectCategory('all');
                      setIsDropdownOpen(false);
                    }}
                  >
                    <span className="dropdown-item-name">All Categories</span>
                    {selectedCategory === 'all' && (
                      <span className="dropdown-item-check">
                        <Check size={14} />
                      </span>
                    )}
                  </button>

                  {/* Individual Categories */}
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.id || selectedCategory === cat.category;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="menuitem"
                        className={`category-dropdown-item ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          onSelectCategory(cat.id);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <span className="dropdown-item-name">{cat.category}</span>
                        {isSelected && (
                          <span className="dropdown-item-check">
                            <Check size={14} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SEARCH ON RIGHT (Desktop inline box / Mobile compact icon button) */}
          {onSearchChange && (
            <div className="filter-search-wrap">
              {/* Desktop permanent compact search */}
              <div className="category-filter-search-box desktop-only-search">
                <Search size={14} className="search-input-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search menu..."
                  className="category-filter-search-input"
                  aria-label="Search menu items"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="category-filter-search-clear"
                    onClick={() => onSearchChange('')}
                    title="Clear search query"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Mobile icon-only search button */}
              <button
                type="button"
                className={`btn-search-trigger-mobile ${searchQuery ? 'has-query' : ''}`}
                onClick={() => setIsMobileSearchActive(true)}
                aria-label="Open search menu"
                title="Search menu"
              >
                <Search size={15} />
                {searchQuery && <span className="search-active-indicator" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
