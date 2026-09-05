import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export const DRINK_ADDONS = [
  { id: 'da1', name: 'Sweetener Syrup', price: 10 },
  { id: 'da2', name: '1 Shot Espresso', price: 10 },
  { id: 'da3', name: 'Strawberry Flavor', price: 10 },
  { id: 'da4', name: 'Blueberry Flavor', price: 10 },
  { id: 'da5', name: 'Almond Syrup', price: 10 },
  { id: 'da6', name: 'Oreo Crumbles', price: 10 },
  { id: 'da7', name: 'Caramel Drizzle', price: 10 },
  { id: 'da8', name: 'Chocolate Drizzle', price: 15 },
  { id: 'da9', name: 'Boba Pearls', price: 20 },
  { id: 'da10', name: 'Nata de Coco', price: 20 },
  { id: 'da11', name: 'Coffee Jelly', price: 20 },
];

export const FOOD_ADDONS = [
  { id: 'fa1', name: 'Extra Egg', price: 20 },
  { id: 'fa2', name: 'Extra Lettuce', price: 20 },
  { id: 'fa3', name: 'Extra Cheese', price: 20 },
  { id: 'fa4', name: 'Extra Mayonnaise', price: 25 },
];

export function getCompatibleAddons(item, menuCategories) {
  if (menuCategories) {
    const current = menuCategories.find(c => c.items.some(i => i.id === (item?.originalId || item?.id)));
    if (current?.id === 'drinkaddons' || current?.id === 'foodaddons') return [];
    const legacy = getCompatibleAddons({ ...item, category: current?.category || item?.category });
    const addonCategory = legacy === DRINK_ADDONS ? 'drinkaddons' : 'foodaddons';
    return legacy.length ? (menuCategories.find(c => c.id === addonCategory)?.items || legacy).filter(a => a.inStock !== false && a.active !== false) : [];
  }
  if (!item) return [];
  const id = String(item.id || item.originalId || '').toLowerCase();
  const category = String(item.category || '').toLowerCase();
  const name = String(item.rawName || item.name || '').toLowerCase();

  // Exclude add-ons themselves from having nested add-ons
  if (id.startsWith('da') || id.startsWith('fa') || category.includes('addon') || name.includes('add-on')) {
    return [];
  }

  // Drinks (Coffee, Non-Coffee, Soda / Refreshers)
  if (
    id.startsWith('cf') ||
    id.startsWith('nc') ||
    id.startsWith('sd') ||
    category.includes('coffee') ||
    category.includes('drink') ||
    category.includes('soda') ||
    category.includes('refresher')
  ) {
    return DRINK_ADDONS;
  }

  // Food items (Burgers, Sandwiches, Rice Meals, Pasta, Pizza, Quesadillas, Waffles, Pikapika)
  if (
    id.startsWith('sw') ||
    id.startsWith('rc') ||
    id.startsWith('ps') ||
    id.startsWith('pz') ||
    id.startsWith('qs') ||
    id.startsWith('wf') ||
    id.startsWith('pk') ||
    category.includes('food') ||
    category.includes('sandwich') ||
    category.includes('rice') ||
    category.includes('pasta') ||
    category.includes('pizza') ||
    category.includes('quesadilla') ||
    category.includes('waffle') ||
    category.includes('pikapika')
  ) {
    return FOOD_ADDONS;
  }

  // Default fallback based on drinks
  return DRINK_ADDONS;
}

export default function ItemAddonsModal({ isOpen, item, onClose, onSave }) {
  const { menuCategories } = useApp();
  if (!isOpen || !item) return null;
  return <AddonEditor key={item.id} item={item} onClose={onClose} onSave={onSave} menuCategories={menuCategories} />;
}

function AddonEditor({ item, onClose, onSave, menuCategories }) {
  const availableAddons = getCompatibleAddons(item, menuCategories);
  const isDrink = getCompatibleAddons(item) === DRINK_ADDONS;
  const initialSelectedIds = (item.addons || []).map((a) => a.id);
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 600);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleAddon = (addonId) => {
    setSelectedIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const handleSave = () => {
    const chosenAddons = availableAddons.filter((a) => selectedIds.includes(a.id));
    onSave(item.id, chosenAddons);
    onClose();
  };

  const selectedAddonsList = availableAddons.filter((a) => selectedIds.includes(a.id));
  const addonTotal = selectedAddonsList.reduce((sum, a) => sum + a.price, 0);
  const basePrice = item.basePrice || item.price;
  const currentTotal = basePrice + addonTotal;

  return (
    <div
      className="receipt-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(26, 12, 6, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 100005,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '16px',
        animation: 'backdropFade 0.2s ease-out'
      }}
    >
      <div
        className="customize-addons-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          color: '#1A0C06',
          border: '1px solid #E4DAD0',
          borderRadius: isMobile ? '20px 20px 0 0' : '20px',
          width: '100%',
          maxWidth: isMobile ? '100%' : '440px',
          maxHeight: isMobile ? '88vh' : '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(44, 24, 16, 0.28), 0 4px 16px rgba(44, 24, 16, 0.08)',
          overflow: 'hidden',
          fontFamily: "var(--font-body, 'Inter', sans-serif)",
          animation: isMobile
            ? 'slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'receipt3DIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Mobile Handle Bar */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px', paddingBottom: '4px' }}>
            <div
              style={{
                width: '36px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: '#D4C6BA'
              }}
            />
          </div>
        )}

        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '16px 20px 14px',
            borderBottom: '1.5px solid #F0E8E0',
            background: '#FFFFFF'
          }}
        >
          <div style={{ paddingRight: '12px' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#1A0C06',
                lineHeight: 1.25,
                letterSpacing: '-0.2px'
              }}
            >
              Customize {item.rawName || item.name}
            </h2>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#6A584D'
              }}
            >
              {item.size ? `${item.size} • ` : ''}Base ₱{basePrice.toFixed(2)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close customization modal"
            style={{
              background: '#F8F4EE',
              border: '1px solid #E4DAD0',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#5C4635',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.95rem',
              fontWeight: 700,
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
          >
            ✕
          </button>
        </div>

        {/* Section Heading with Clear Contrast */}
        <div
          style={{
            padding: '14px 20px 8px',
            background: '#FAF6F2',
            borderBottom: '1px solid #F0E8E0'
          }}
        >
          <div
            style={{
              fontSize: '0.92rem',
              fontWeight: 800,
              color: '#1A0C06',
              letterSpacing: '0.1px'
            }}
          >
            {isDrink ? 'Drink Add-ons' : 'Food Add-ons'}
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              color: '#7D675B',
              marginTop: '2px',
              fontWeight: 500
            }}
          >
            {isDrink
              ? 'Choose any extras for your drink'
              : 'Choose any extras for your meal'}
          </div>
        </div>

        {/* Scrollable Add-ons Selectable Rows */}
        <div
          style={{
            padding: '12px 18px 16px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: '#FAF6F2'
          }}
        >
          {availableAddons.map((addon) => {
            const isSelected = selectedIds.includes(addon.id);
            return (
              <div
                key={addon.id}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => toggleAddon(addon.id)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    toggleAddon(addon.id);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '50px',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: isSelected ? '1.5px solid #8B6F4E' : '1.5px solid #E8DDD4',
                  background: isSelected ? '#F4EAE0' : '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: isSelected
                    ? '0 2px 8px rgba(139, 111, 78, 0.15)'
                    : '0 1px 3px rgba(44, 24, 16, 0.03)',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Left: Add-on Name */}
                <span
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? '#1A0C06' : '#2B1810',
                    lineHeight: 1.3
                  }}
                >
                  {addon.name}
                </span>

                {/* Right: +₱price & selection indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: isSelected ? 800 : 700,
                      color: isSelected ? '#1A0C06' : '#5C4635',
                      fontFamily: "var(--font-mono, 'Space Mono', monospace)"
                    }}
                  >
                    +₱{addon.price}
                  </span>

                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: isSelected ? '1.5px solid #8B6F4E' : '1.5px solid #C4B2A3',
                      background: isSelected ? '#8B6F4E' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                  >
                    {isSelected ? '✓' : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fixed Sticky Footer Actions */}
        <div
          style={{
            padding: '14px 18px 16px',
            borderTop: '1.5px solid #E8DDD4',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '11px 18px',
              borderRadius: '10px',
              border: '1.5px solid #D4C6BA',
              background: '#FFFFFF',
              color: '#5C4635',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              flex: 1,
              height: '44px',
              borderRadius: '10px',
              border: '1px solid #1A0C06',
              background: 'linear-gradient(180deg, #3B2718 0%, #24140B 100%)',
              color: '#FFFFFF',
              fontSize: '0.92rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(44, 24, 16, 0.25)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
          >
            <span>
              {addonTotal > 0
                ? `Save Add-ons • +₱${addonTotal.toFixed(0)}`
                : 'Save Add-ons'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
