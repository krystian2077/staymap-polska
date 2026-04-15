import { HeroSearchBar } from "@/components/home/HeroSearchBar";

export function HeroSection() {
  return (
    <section className="relative flex min-h-0 items-center justify-center overflow-hidden bg-white px-4 pb-14 pt-8 text-center sm:px-6 sm:pb-24 sm:pt-14 md:min-h-[calc(100dvh-var(--nav-h))] md:px-10 md:pb-[100px] md:pt-[80px] xl:px-12">

      <div className="relative z-[5] w-full max-w-[960px]">
        <style>{`
          @keyframes slideInDown {
            from {
              opacity: 0;
              transform: translateY(-30px) scale(0.92);
              filter: blur(5px);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
              filter: blur(0);
            }
          }
          @keyframes floatUp {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-12px);
            }
          }
          @keyframes radialGlow {
            0%, 100% {
              box-shadow: 
                inset 0 0 20px rgba(16, 185, 129, 0.05),
                0 0 25px rgba(16, 185, 129, 0.15),
                0 0 50px rgba(16, 185, 129, 0.08),
                0 8px 20px rgba(0, 0, 0, 0.08);
            }
            50% {
              box-shadow: 
                inset 0 0 30px rgba(16, 185, 129, 0.1),
                0 0 40px rgba(16, 185, 129, 0.25),
                0 0 70px rgba(16, 185, 129, 0.15),
                0 12px 30px rgba(0, 0, 0, 0.12);
            }
          }
          @keyframes shimmerEffect {
            0% {
              background-position: -1000px 0;
            }
            100% {
              background-position: 1000px 0;
            }
          }
          @keyframes dotPulse {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
            }
            50% {
              transform: scale(1.25);
              box-shadow: 0 0 15px rgba(16, 185, 129, 0.8);
            }
          }
          @keyframes borderShimmer {
            0%, 100% {
              border-color: rgba(16, 185, 129, 0.35);
            }
            50% {
              border-color: rgba(16, 185, 129, 0.65);
            }
          }
          @keyframes textGlow {
            0%, 100% {
              color: #0a5f40;
              text-shadow: 0 0 5px rgba(10, 95, 64, 0);
            }
            50% {
              color: #106946;
              text-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
            }
          }
          .badge-premium-natural {
            animation: 
              slideInDown 0.8s cubic-bezier(0.23, 1, 0.320, 1),
              floatUp 4s ease-in-out infinite 0.9s,
              radialGlow 4.5s ease-in-out infinite 0.9s,
              borderShimmer 4.5s ease-in-out infinite 0.9s;
            transition: all 0.4s cubic-bezier(0.23, 1, 0.320, 1);
            backdrop-filter: blur(2px);
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #ecfdf5 100%);
            background-size: 200% 200%;
          }
          .badge-premium-natural:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 
              inset 0 0 35px rgba(16, 185, 129, 0.15),
              0 0 50px rgba(16, 185, 129, 0.35),
              0 0 80px rgba(16, 185, 129, 0.2),
              0 16px 40px rgba(0, 0, 0, 0.15);
            border-color: rgba(16, 185, 129, 0.75);
          }
          .badge-text-premium {
            animation: textGlow 3.5s ease-in-out infinite 0.9s;
            transition: all 0.3s ease;
          }
          .badge-dot-premium {
            animation: dotPulse 2.5s ease-in-out infinite 0.9s;
            transition: all 0.3s ease;
          }
          @media (max-width: 768px) {
            .badge-premium-natural {
              animation: slideInDown 0.6s cubic-bezier(0.23, 1, 0.320, 1);
            }
            .badge-premium-natural:hover {
              transform: none;
            }
            .badge-text-premium,
            .badge-dot-premium {
              animation: none;
            }
          }
        `}</style>
        <div className="badge-premium-natural mx-auto inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-[#10b981]/35 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[.08em] sm:gap-3 sm:px-8 sm:py-3.5 sm:text-[14px]">
          <span className="badge-dot-premium h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] sm:h-3 sm:w-3" />
          <span className="badge-text-premium font-bold tracking-wide">Odkryj Polskę od nowa</span>
          <span className="text-[#9ca3af] font-light">·</span>
          <span className="badge-text-premium text-[#4b5563]">2 400+ ofert</span>
        </div>

        <h1 className="a1 mb-2 mt-6 text-[clamp(32px,9vw,96px)] font-black leading-[.98] tracking-[-1.5px] text-[#0a2e1a] sm:mb-[10px] sm:mt-14 sm:tracking-[-4px] md:mt-16">
          <span className="hero-gradient-text">Znajdź nocleg</span>
          <span className="mt-2 block text-[clamp(18px,5.5vw,42px)] font-light tracking-[-0.5px] text-[#3d4f45] sm:tracking-[-1px]">
            w sercu polskiej natury
          </span>
        </h1>

        <p className="a2 mx-auto mb-6 mt-3 max-w-[560px] text-[15px] font-normal leading-[1.6] text-[#3d4f45] sm:mb-14 sm:mt-[22px] sm:text-[18px] sm:leading-[1.75]">
          Domki, chaty i apartamenty w najpiękniejszych miejscach.
          <br />
          Wyszukaj na mapie, zarezerwuj i ciesz się chwilą.
        </p>

        <div className="a3">
          <HeroSearchBar />
        </div>

      </div>
    </section>
  );
}
