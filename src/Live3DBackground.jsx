import React, { useEffect, useRef } from 'react';

export default function Live3DBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Mouse & Touch parallax with continuous subtle idle sway
    let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };
    let hasTouchOrMouse = false;

    const handleMouseMove = (e) => {
      hasTouchOrMouse = true;
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        hasTouchOrMouse = true;
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    const isMobile = width < 768;
    const NUM_NODES = isMobile ? 24 : 38;
    const NUM_BEANS = isMobile ? 8 : 14;
    const MAX_LINE_DIST_3D = isMobile ? 180 : 220;
    const fov = 500;

    class Node3D {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = (Math.random() - 0.5) * width * 1.4;
        this.y = initial ? (Math.random() - 0.5) * height * 1.4 : height * 0.7 + Math.random() * 100;
        this.z = Math.random() * 700 + 100;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = -(Math.random() * 0.35 + 0.15);
        this.vz = (Math.random() - 0.5) * 0.25;
        this.radius = Math.random() * 2.5 + 1.5;
        this.projX = 0;
        this.projY = 0;
        this.scale = 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        if (this.z < 50 || this.z > 850) this.vz = -this.vz;
        if (this.y < -height * 0.8) this.reset();
      }

      project(parallaxX, parallaxY) {
        const effX = this.x + parallaxX * (900 - this.z) * 0.035;
        const effY = this.y + parallaxY * (900 - this.z) * 0.035;

        this.scale = fov / (fov + this.z);
        this.projX = width / 2 + effX * this.scale;
        this.projY = height / 2 + effY * this.scale;
      }

      draw() {
        if (this.projX < -30 || this.projX > width + 30 || this.projY < -30 || this.projY > height + 30) return;
        const alpha = Math.min(0.5, Math.max(0.1, this.scale * 0.6));
        ctx.fillStyle = `rgba(201, 139, 91, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.projX, this.projY, this.radius * this.scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    class Bean3D {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = (Math.random() - 0.5) * width * 1.5;
        this.y = initial ? (Math.random() - 0.5) * height * 1.5 : height * 0.8 + Math.random() * 200;
        this.z = Math.random() * 700 + 200;
        this.size = Math.random() * 14 + 10;
        
        this.rotX = Math.random() * Math.PI * 2;
        this.rotY = Math.random() * Math.PI * 2;
        this.rotZ = Math.random() * Math.PI * 2;
        
        this.rotSpeedX = (Math.random() - 0.5) * 0.012;
        this.rotSpeedY = (Math.random() - 0.5) * 0.015;
        this.rotSpeedZ = (Math.random() - 0.5) * 0.008;

        this.vy = -(Math.random() * 0.3 + 0.12);
        this.vx = (Math.random() - 0.5) * 0.18;
      }

      update() {
        this.y += this.vy;
        this.x += this.vx;
        this.rotX += this.rotSpeedX;
        this.rotY += this.rotSpeedY;
        this.rotZ += this.rotSpeedZ;

        if (this.y < -height * 0.9) this.reset();
      }

      draw(parallaxX, parallaxY) {
        const effX = this.x + parallaxX * (1000 - this.z) * 0.04;
        const effY = this.y + parallaxY * (1000 - this.z) * 0.04;

        const scale = fov / (fov + this.z);
        const projX = width / 2 + effX * scale;
        const projY = height / 2 + effY * scale;
        const projSize = this.size * scale;

        if (projX < -40 || projX > width + 40 || projY < -40 || projY > height + 40) return;

        ctx.save();
        ctx.translate(projX, projY);
        ctx.rotate(this.rotZ);

        const scaleX = Math.cos(this.rotY);
        const scaleY = Math.cos(this.rotX);
        ctx.scale(Math.max(0.18, Math.abs(scaleX)), Math.max(0.18, Math.abs(scaleY)));

        const alpha = Math.min(0.35, Math.max(0.08, scale * 0.5));
        const grad = ctx.createRadialGradient(-projSize * 0.2, -projSize * 0.2, projSize * 0.1, 0, 0, projSize);
        grad.addColorStop(0, `rgba(224, 168, 120, ${alpha * 1.2})`);
        grad.addColorStop(0.5, `rgba(201, 139, 91, ${alpha})`);
        grad.addColorStop(1, `rgba(27, 24, 21, ${alpha * 0.95})`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, projSize * 0.8, projSize * 1.25, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(17, 16, 14, ${alpha * 1.5})`;
        ctx.lineWidth = Math.max(1, projSize * 0.1);
        ctx.beginPath();
        ctx.moveTo(0, -projSize * 0.95);
        ctx.bezierCurveTo(projSize * 0.2, -projSize * 0.3, -projSize * 0.2, projSize * 0.3, 0, projSize * 0.95);
        ctx.stroke();

        ctx.restore();
      }
    }

    let time = 0;
    const draw3DWaveLines = (parallaxX, parallaxY) => {
      const waveCount = isMobile ? 2 : 3;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const baseZ = 300 + w * 200;
        const scale = fov / (fov + baseZ);
        const yOffset = height * (0.35 + w * 0.25);

        for (let x = 0; x <= width + 50; x += isMobile ? 40 : 30) {
          const normX = x / width;
          const wave1 = Math.sin(normX * 4 + time * 0.0015 + w) * 30;
          const wave2 = Math.cos(normX * 2.5 - time * 0.001 + w * 1.5) * 20;
          const y = yOffset + (wave1 + wave2) * scale + parallaxY * (w + 1) * 12;
          const px = x + parallaxX * (w + 1) * 12;

          if (x === 0) {
            ctx.moveTo(px, y);
          } else {
            ctx.lineTo(px, y);
          }
        }

        ctx.strokeStyle = `rgba(201, 139, 91, ${0.06 + w * 0.025})`;
        ctx.lineWidth = 1.2 * scale;
        ctx.stroke();
      }
    };

    const nodes = Array.from({ length: NUM_NODES }, () => new Node3D());
    const beans = Array.from({ length: NUM_BEANS }, () => new Bean3D());

    const render = () => {
      time += 16;

      // Auto gentle swaying if no touch/mouse active
      if (!hasTouchOrMouse) {
        mouse.targetX = width / 2 + Math.sin(time * 0.0008) * (width * 0.25);
        mouse.targetY = height / 2 + Math.cos(time * 0.0006) * (height * 0.15);
      }

      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      const parallaxX = (mouse.x - width / 2) / (width / 2);
      const parallaxY = (mouse.y - height / 2) / (height / 2);

      ctx.clearRect(0, 0, width, height);

      // 1. Draw 3D flowing contour lines
      draw3DWaveLines(parallaxX, parallaxY);

      // 2. Update & project nodes
      nodes.forEach((n) => {
        n.update();
        n.project(parallaxX, parallaxY);
      });

      // 3. Connect lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];

          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dz = n1.z - n2.z;
          const dist3D = Math.hypot(dx, dy, dz);

          if (dist3D < MAX_LINE_DIST_3D) {
            const alpha = (1 - dist3D / MAX_LINE_DIST_3D) * 0.18 * Math.min(n1.scale, n2.scale);
            ctx.strokeStyle = `rgba(201, 139, 91, ${alpha})`;
            ctx.lineWidth = Math.max(0.6, (n1.scale + n2.scale) * 0.7);
            ctx.beginPath();
            ctx.moveTo(n1.projX, n1.projY);
            ctx.lineTo(n2.projX, n2.projY);
            ctx.stroke();
          }
        }
      }

      // 4. Draw nodes
      nodes.forEach((n) => n.draw());

      // 5. Draw beans
      beans.sort((a, b) => b.z - a.z);
      beans.forEach((bean) => {
        bean.update();
        bean.draw(parallaxX, parallaxY);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.88,
      }}
    />
  );
}
