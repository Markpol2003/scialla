import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, SlidersHorizontal, Sparkles } from 'lucide-react';

export default function CategoryFilterBar({
  categories,
  selectedCategory,
  onSelectCategory
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const chipsScrollRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const activeCategoryObj = categories.find(
    (c) => c.id === selectedCategory || c.category === selectedCategory
  );

  const selectedLabel = selectedCategory === 'all'
    ? 'All Categories'
    : activeCategoryObj?.category || 'Category';

  const totalItemsCount = categories.reduce((sum, c) => sum + (c.items?.length || 0), 0);
  const activeItemsCount = selectedCategory === 'all'
    ? totalItemsCount
    : (activeCategoryObj?.items?.length || 0);

  return (
    <div className="scialla-category-nav-wrapper">
      <div className="scialla-category-nav-row">
        {/* CUSTOM CATEGORY DROPDOWN TRIGGER */}
        <div className="category-dropdown-container" ref={dropdownRef}>
          <button
            type="button"
            className={`category-dropdown-btn ${isDropdownOpen ? 'open' : ''} ${selectedCategory !== 'all' ? 'has-filter' : ''}`}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-label="Filter menu by category"
            title="Click to select a category"
          >
            <span className="dropdown-btn-icon">
              <SlidersHorizontal size={15} />
            </span>
            <span className="dropdown-btn-text">
              {selectedLabel}
            </span>
            <span className="dropdown-btn-badge">
              {activeItemsCount}
            </span>
            <span className={`dropdown-btn-arrow ${isDropdownOpen ? 'rotated' : ''}`}>
              <ChevronDown size={15} />
            </span>
          </button>

          {/* FLOATING CUSTOM DROPDOWN POPOVER */}
          {isDropdownOpen && (
            <div className="category-dropdown-menu" role="menu">
              <div className="category-dropdown-header">
                <span>Select Category</span>
                <span className="category-dropdown-sub">{categories.length + 1} options</span>
              </div>

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
                  <div className="dropdown-item-info">
                    <span className="dropdown-item-name">All Categories</span>
                    <span className="dropdown-item-count">{totalItemsCount} items</span>
                  </div>
                  {selectedCategory === 'all' && (
                    <span className="dropdown-item-check">
                      <Check size={16} />
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
                      <div className="dropdown-item-info">
                        <span className="dropdown-item-name">{cat.category}</span>
                        <span className="dropdown-item-count">
                          {cat.items?.length || 0} {cat.items?.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="dropdown-item-check">
                          <Check size={16} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* HORIZONTAL QUICK CATEGORY CHIPS */}
        <div className="category-chips-scroll" ref={chipsScrollRef}>
          <button
            type="button"
            className={`scialla-nav-chip ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => onSelectCategory('all')}
          >
            All
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id || selectedCategory === cat.category;
            return (
              <button
                key={cat.id}
                type="button"
                className={`scialla-nav-chip ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectCategory(cat.id)}
              >
                {cat.category}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
