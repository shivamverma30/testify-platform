"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function HomePage() {
  const slides = ["nit1.webp", "nit2.webp", "nit3.webp", "nit4.webp", "nit5.webp", "nit6.webp"];
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6 sm:py-14">
      <div className="absolute inset-0 z-0">
        {slides.map((slide, index) => (
          <div
            key={slide}
            className="slide-layer"
            style={{
              backgroundImage: `url(/nit-bg/${slide})`,
              animationDelay: `${index * 5}s`,
            }}
          />
        ))}

        <div className="absolute inset-0 bg-[rgba(10,14,26,0.65)]" />
        <div
          className="absolute inset-0 bg-[rgba(0,0,0,0.35)] transition-opacity duration-400"
          style={{ opacity: isExpanded ? 1 : 0 }}
        />
      </div>

      <section
        className={`hero-card relative z-10 overflow-hidden text-center ${isExpanded ? "expanded" : "collapsed"}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="logo-wrap">
          <Image
            src="/assets/logo/testify-logo.svg"
            alt="Testify"
            width={360}
            height={117}
            priority
            style={{ height: "auto" }}
            className="hero-logo"
          />
        </div>

        <div className="text-sm text-slate-100/88 sm:text-lg quote-fade md:text-xl">
          <p>Your NIT seat is one test away.</p>
        </div>

        <div className={`expand-content ${isExpanded ? "show" : "hide"}`}>
          <p className="mt-3 text-sm text-slate-100/88 sm:text-lg md:text-xl">
            Every mock test brings you closer to NIT.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="cta-button w-full min-w-45 max-w-[320px] px-6 py-3 text-center text-sm font-semibold text-white sm:w-auto"
            >
              Register
            </Link>
            <Link
              href="/login"
              className="cta-button w-full min-w-45 max-w-[320px] px-6 py-3 text-center text-sm font-semibold text-white sm:w-auto"
            >
              Login
            </Link>
            <Link
              href="/explore-tests"
              className="cta-button w-full min-w-45 max-w-[320px] px-6 py-3 text-center text-sm font-semibold text-white sm:w-auto"
            >
              Explore Tests
            </Link>
          </div>
        </div>
      </section>

      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 px-4 text-center text-xs sm:text-sm footer-credit">
        <p>
          Made with <span className="text-red-500">❤</span> by Shivam Verma
        </p>
      </div>

      {/* Preload slideshow assets to reduce first-cycle flicker. */}
      <div className="sr-only" aria-hidden="true">
        {slides.map((slide) => (
          <img key={`${slide}-preload`} src={`/nit-bg/${slide}`} alt="" loading="eager" />
        ))}
      </div>

      <style jsx>{`
        .slide-layer {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0;
          will-change: opacity, transform;
          animation: slideFade 30s infinite;
        }

        .title-letter {
          display: inline-block;
          opacity: 0;
          transform: translateY(8px);
          animation: letterEnter 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .hero-card {
          width: min(92vw, 460px);
          min-height: 160px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-radius: 28px;
          animation: cardFloat 6s ease-in-out infinite;
          transition: all 0.4s ease;
          position: relative;
          z-index: 1;
        }

        .hero-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.08),
              rgba(255, 255, 255, 0.02)
            ),
            rgba(15, 23, 42, 0.25);
          backdrop-filter: blur(30px);
          box-shadow: 0 20px 56px rgba(0, 0, 0, 0.36);
          opacity: 0;
          transform: scale(0.95);
          transition: opacity 0.4s ease, transform 0.4s ease;
          pointer-events: none;
          z-index: -1;
        }

        .hero-card.expanded {
          width: min(94vw, 682px);
          min-height: 242px;
          padding: 2.5rem 2.75rem;
          border-radius: 30px;
        }

        .hero-card.expanded::before {
          opacity: 1;
          transform: scale(1);
          box-shadow: 0 0 70px rgba(59, 130, 246, 0.25);
        }

        @media (max-width: 639px) {
          .hero-card {
            padding: 1.4rem 1.2rem;
          }

          .hero-card.expanded {
            padding: 1.8rem 1.2rem;
            min-height: 420px;
          }
        }

        .title-main {
          background: none;
          color: #38bdf8;
          -webkit-text-fill-color: #38bdf8;
          text-shadow: 0 0 5px #38bdf8, 0 0 10px #38bdf8, 0 0 20px #3b82f6, 0 0 40px #3b82f6;
          animation: letterEnter 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards,
            neonPulse 3s ease-in-out infinite;
        }

        .expand-content {
          overflow: hidden;
          transition: max-height 0.35s ease, opacity 0.35s ease, transform 0.35s ease;
        }

        .expand-content.hide {
          max-height: 0;
          opacity: 0;
          transform: translateY(8px);
          pointer-events: none;
        }

        .expand-content.show {
          max-height: 320px;
          opacity: 1;
          transform: translateY(0);
        }

        .quote-fade {
          opacity: 0;
          animation: quoteEnter 900ms ease forwards;
          animation-delay: 220ms;
        }

        .cta-button {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(8px);
          transition: transform 280ms ease, box-shadow 280ms ease, border-color 280ms ease,
            background-color 280ms ease;
        }

        .cta-button:hover {
          background: rgba(255, 255, 255, 0.16);
          transform: scale(1.05);
          border-color: rgba(255, 255, 255, 0.26);
          box-shadow: 0 10px 28px rgba(96, 165, 250, 0.28);
        }

        .footer-credit {
          color: rgba(180, 200, 255, 0.7);
          opacity: 0.86;
          letter-spacing: 0.02em;
          background: transparent;
        }

        @keyframes slideFade {
          0% {
            opacity: 0;
            transform: scale(1);
          }
          8% {
            opacity: 1;
            transform: scale(1.01);
          }
          24% {
            opacity: 1;
            transform: scale(1.05);
          }
          32% {
            opacity: 0;
            transform: scale(1.05);
          }
          100% {
            opacity: 0;
            transform: scale(1.05);
          }
        }

        @keyframes gradientMove {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes quoteEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes letterEnter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cardFloat {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
          100% {
            transform: translateY(0);
          }
        }

        @keyframes neonPulse {
          0% {
            text-shadow: 0 0 5px #38bdf8, 0 0 10px #38bdf8, 0 0 18px #3b82f6, 0 0 30px #3b82f6;
          }
          50% {
            text-shadow: 0 0 8px #38bdf8, 0 0 14px #38bdf8, 0 0 24px #3b82f6, 0 0 38px #3b82f6;
          }
          100% {
            text-shadow: 0 0 5px #38bdf8, 0 0 10px #38bdf8, 0 0 18px #3b82f6, 0 0 30px #3b82f6;
          }
        }

        .logo-wrap {
          display: flex;
          width: 100%;
          justify-content: center;
          align-items: center;
          margin-bottom: 28px;
        }

        .hero-logo {
          width: min(360px, 80vw);
          height: auto;
          max-width: 80%;
          margin: 0;
          transition: transform 0.3s ease;
        }

        .hero-card:hover .hero-logo {
          transform: scale(1.05);
        }

        @media (max-width: 639px) {
          .hero-logo {
            width: min(300px, 78vw);
          }
        }
      `}</style>
    </main>
  );
}
