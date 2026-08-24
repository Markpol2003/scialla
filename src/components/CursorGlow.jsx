import React, { useEffect, useRef } from 'react';

export default function CursorGlow() {
  const dotRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    // Disable on touch-primary devices
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    let mouseX = -100;
    let mouseY = -100;
    let dotX = -100;
    let dotY = -100;
    let glowX = -100;
    let glowY = -100;
    let isVisible = false;
    let animId;

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        if (dotRef.current) dotRef.current.style.opacity = '1';
        if (glowRef.current) glowRef.current.style.opacity = '1';
      }
    };

    const handleMouseLeave = () => {
      isVisible = false;
      if (dotRef.current) dotRef.current.style.opacity = '0';
      if (glowRef.current) glowRef.current.style.opacity = '0';
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      if (
        target &&
        target.closest &&
        target.closest('button, a, input, select, textarea, .coffee-card-3d, .customer-cat-chip, .table-chip-btn, .kpi-card, .btn-action-step')
      ) {
        if (glowRef.current) {
          glowRef.current.style.width = '360px';
          glowRef.current.style.height = '360px';
          glowRef.current.style.background = 'radial-gradient(circle, rgba(201, 139, 91, 0.35) 0%, rgba(201, 139, 91, 0.12) 40%, rgba(139, 90, 43, 0) 70%)';
        }
        if (dotRef.current) {
          dotRef.current.style.width = '14px';
          dotRef.current.style.height = '14px';
          dotRef.current.style.boxShadow = '0 0 16px 4px rgba(243, 229, 171, 0.9), 0 0 24px 8px rgba(201, 139, 91, 0.6)';
        }
      } else {
        if (glowRef.current) {
          glowRef.current.style.width = '280px';
          glowRef.current.style.height = '280px';
          glowRef.current.style.background = 'radial-gradient(circle, rgba(201, 139, 91, 0.22) 0%, rgba(201, 139, 91, 0.08) 40%, rgba(139, 90, 43, 0) 70%)';
        }
        if (dotRef.current) {
          dotRef.current.style.width = '8px';
          dotRef.current.style.height = '8px';
          dotRef.current.style.boxShadow = '0 0 10px 2px rgba(243, 229, 171, 0.8), 0 0 18px 4px rgba(201, 139, 91, 0.45)';
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseover', handleMouseOver);

    // Smooth physics RAF loop (Lerp)
    const animate = () => {
      if (dotX === -100 && mouseX !== -100) {
        dotX = mouseX;
        dotY = mouseY;
        glowX = mouseX;
        glowY = mouseY;
      } else {
        dotX += (mouseX - dotX) * 0.35;
        dotY += (mouseY - dotY) * 0.35;
        glowX += (mouseX - glowX) * 0.15;
        glowY += (mouseY - glowY) * 0.15;
      }

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dotX}px, ${dotY}px, 0px) translate(-50%, -50%)`;
      }

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${glowX}px, ${glowY}px, 0px) translate(-50%, -50%)`;
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseover', handleMouseOver);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <>
      {/* Outer Soft Caramel & Gold Ambient Light Glow */}
      <div
        ref={glowRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(201, 139, 91, 0.22) 0%, rgba(201, 139, 91, 0.08) 40%, rgba(139, 90, 43, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 999990,
          opacity: 0,
          transition: 'width 0.3s ease, height 0.3s ease, background 0.3s ease, opacity 0.2s ease',
          willChange: 'transform',
          mixBlendMode: 'screen'
        }}
      />

      {/* Inner Small Gold Light Core */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#F3E5AB',
          boxShadow: '0 0 10px 2px rgba(243, 229, 171, 0.8), 0 0 18px 4px rgba(201, 139, 91, 0.45)',
          pointerEvents: 'none',
          zIndex: 999991,
          opacity: 0,
          transition: 'width 0.2s ease, height 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
          willChange: 'transform'
        }}
      />
    </>
  );
}
