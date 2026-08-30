import { useEffect, useRef, useState } from "react";

interface AnimatedHeroBackgroundProps {
  children?: React.ReactNode;
}

export function AnimatedHeroBackground({ children }: AnimatedHeroBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [terminalLineIndex, setTerminalLineIndex] = useState(0);

  const terminalLogs = [
    "yuga-spark init --rgmcet",
    "matching hackathon squads...",
    "found 18 active builders",
    "saturday build sprint: ACTIVE",
    "xp leaderboard: synced",
    "status: WINNER 🏆",
  ];

  // Cycle terminal code lines
  useEffect(() => {
    const interval = setInterval(() => {
      setTerminalLineIndex((prev) => (prev + 1) % terminalLogs.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [terminalLogs.length]);

  // Handle 3D Tilt Parallax on Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0 to 1
    const y = (e.clientY - rect.top) / rect.height; // 0 to 1

    setMousePos({ x, y });

    // Tilt range -6deg to +6deg
    const tiltX = (y - 0.5) * -10;
    const tiltY = (x - 0.5) * 10;
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setMousePos({ x: 0.5, y: 0.5 });
  };

  // Sparkles / Fireflies Floating Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || 1200);
    let height = (canvas.height = canvas.offsetHeight || 720);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 1200;
      height = canvas.height = canvas.offsetHeight || 720;
    };
    window.addEventListener("resize", handleResize);

    // Create 30 golden & blue spark particles
    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.5 + 1,
      color: Math.random() > 0.4 ? "rgba(24, 144, 240, " : "rgba(255, 215, 0, ",
      alpha: Math.random() * 0.7 + 0.3,
      speedX: (Math.random() - 0.5) * 0.6,
      speedY: -Math.random() * 0.8 - 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.alpha += Math.sin(Date.now() * p.pulseSpeed) * 0.01;

        // Wrap around bottom/top
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.max(0.1, Math.min(1, p.alpha))})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color + "0.8)";
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full rounded-[24px] sm:rounded-[32px] overflow-hidden min-h-[640px] sm:min-h-[720px] flex flex-col justify-between p-6 sm:p-10 shadow-2xl border border-[#202020]/15 group transition-transform duration-300 ease-out"
      style={{
        perspective: "1000px",
      }}
    >
      {/* ━━━ LAYER 1: 3D Tilting Pixel Art Background Image ━━━ */}
      <div
        className="absolute inset-0 w-full h-full transition-transform duration-200 ease-out pointer-events-none"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.05)`,
          transformStyle: "preserve-3d",
        }}
      >
        <img
          src="/cofounder_hero_landscape.jpg"
          alt="Yuga Spark Animated Pixel Art Landscape"
          className="w-full h-full object-cover object-center"
        />

        {/* Animated Sun Glow Lens Flare */}
        <div
          className="absolute w-44 h-44 rounded-full pointer-events-none animate-pulse"
          style={{
            top: "16%",
            right: "30%",
            background: "radial-gradient(circle, rgba(255, 230, 150, 0.6) 0%, rgba(24, 144, 240, 0.2) 50%, transparent 70%)",
            filter: "blur(12px)",
            transform: `translate(${mousePos.x * 15}px, ${mousePos.y * 15}px)`,
          }}
        />

        {/* Rotating Sunburst Light Rays */}
        <div
          className="absolute w-72 h-72 rounded-full pointer-events-none opacity-30 animate-spin"
          style={{
            top: "10%",
            right: "25%",
            background: "conic-gradient(from 0deg, transparent 0deg, rgba(255, 255, 255, 0.4) 20deg, transparent 40deg, rgba(255, 255, 255, 0.4) 60deg, transparent 80deg)",
            animationDuration: "40s",
          }}
        />

        {/* Drifting Clouds Overlay */}
        <div
          className="absolute top-8 left-0 right-0 h-28 pointer-events-none opacity-40 transition-transform duration-500"
          style={{
            transform: `translateX(${mousePos.x * -25}px)`,
          }}
        >
          <div className="w-[120%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent blur-md transform -rotate-1 animate-pulse" />
        </div>
      </div>

      {/* ━━━ LAYER 2: Floating Sparkles Particle Canvas Overlay ━━━ */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* ━━━ LAYER 3: Animated Live Terminal Code Monitor over Laptop ━━━ */}
      <div
        className="absolute z-10 pointer-events-none hidden sm:block shadow-2xl transition-transform duration-300"
        style={{
          bottom: "19%",
          left: "21%",
          transform: `translate3d(${mousePos.x * 20}px, ${mousePos.y * 20}px, 30px) rotate(-3deg)`,
        }}
      >
        <div className="bg-[#0d1117]/90 backdrop-blur-md border border-green-500/50 rounded-lg p-2.5 w-48 text-[10px] font-mono text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)] space-y-1">
          <div className="flex items-center justify-between text-[9px] text-gray-400 border-b border-gray-700/60 pb-1 mb-1">
            <span className="flex items-center gap-1 text-green-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping inline-block" />
              BUILDER_TERMINAL
            </span>
            <span>RGMCET</span>
          </div>

          <div className="truncate text-green-300">
            $ {terminalLogs[terminalLineIndex]}
          </div>

          <div className="flex items-center justify-between text-[9px] text-gray-400 pt-0.5">
            <span className="text-gray-400">status: ok</span>
            <span className="w-1.5 h-3 bg-green-400 animate-pulse inline-block" />
          </div>
        </div>
      </div>

      {/* ━━━ LAYER 4: Children Content (Header Bar & Hero Right Card) ━━━ */}
      {children}
    </div>
  );
}
