"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";

const TRAVEL_MODES = [
  {
    id: "romantic",
    emoji: "💑",
    headline: "Dla par",
    description: "Kameralne miejsca z jacuzzi, kominkiem i atmosferą dla dwojga",
    gradient: "from-rose-50 to-rose-100",
    textGradient: "from-rose-600 to-red-600",
    shadow: "shadow-rose-200",
    darkGradient: "from-rose-500 to-red-600",
    accentColor: "rose",
    icon: "💕",
  },
  {
    id: "family",
    emoji: "👨‍👩‍👧",
    headline: "Dla rodzin",
    description: "Przestronne domki z placem zabaw, bezpieczeństwem i wygodą dla dzieci",
    gradient: "from-sky-50 to-blue-100",
    textGradient: "from-sky-600 to-blue-600",
    shadow: "shadow-sky-200",
    darkGradient: "from-sky-500 to-blue-600",
    accentColor: "sky",
    icon: "👶",
  },
  {
    id: "pet",
    emoji: "🐕",
    headline: "Z pupilem",
    description: "Obiekty przyjazne zwierzętom z ogrodzonym terenem i spacerami",
    gradient: "from-amber-50 to-orange-100",
    textGradient: "from-amber-600 to-orange-600",
    shadow: "shadow-amber-200",
    darkGradient: "from-amber-500 to-orange-600",
    accentColor: "amber",
    icon: "🦴",
  },
  {
    id: "workation",
    emoji: "💻",
    headline: "Workation",
    description: "Szybki internet, ergonomiczne biurko i spokojne środowisko do pracy",
    gradient: "from-indigo-50 to-purple-100",
    textGradient: "from-indigo-600 to-purple-600",
    shadow: "shadow-indigo-200",
    darkGradient: "from-indigo-500 to-purple-600",
    accentColor: "indigo",
    icon: "🌐",
  },
  {
    id: "slow",
    emoji: "🌿",
    headline: "Slow escape",
    description: "Agroturystyka, lasy i całkowity reset od stresu miejskiego",
    gradient: "from-emerald-50 to-teal-100",
    textGradient: "from-emerald-600 to-teal-600",
    shadow: "shadow-emerald-200",
    darkGradient: "from-emerald-500 to-teal-600",
    accentColor: "emerald",
    icon: "🍃",
  },
  {
    id: "outdoor",
    emoji: "🚵",
    headline: "Dla aktywnych",
    description: "Baza na szlaki, trasy rowerowe, kajaki i przygody na świeżym powietrzu",
    gradient: "from-orange-50 to-amber-100",
    textGradient: "from-orange-600 to-amber-600",
    shadow: "shadow-orange-200",
    darkGradient: "from-orange-500 to-amber-600",
    accentColor: "orange",
    icon: "⛺",
  },
  {
    id: "lake",
    emoji: "🌊",
    headline: "Nad jeziorem",
    description: "Własny pomost, kajaki, wschód słońca nad wodą i spokojne wypoczęcie",
    gradient: "from-cyan-50 to-blue-100",
    textGradient: "from-cyan-600 to-blue-600",
    shadow: "shadow-cyan-200",
    darkGradient: "from-cyan-500 to-blue-600",
    accentColor: "cyan",
    icon: "🏊",
  },
  {
    id: "mountains",
    emoji: "🏔️",
    headline: "W górach",
    description: "Tatry, Beskidy - domki z widokami, sauna i górskie szlaki",
    gradient: "from-slate-50 to-gray-100",
    textGradient: "from-slate-600 to-gray-700",
    shadow: "shadow-slate-200",
    darkGradient: "from-slate-500 to-gray-700",
    accentColor: "slate",
    icon: "⛰️",
  },
  {
    id: "wellness",
    emoji: "🧖",
    headline: "Wellness & Spa",
    description: "Sauna, jacuzzi, basen i kompleksowy relaks bez opuszczania pokoju",
    gradient: "from-purple-50 to-pink-100",
    textGradient: "from-purple-600 to-pink-600",
    shadow: "shadow-purple-200",
    darkGradient: "from-purple-500 to-pink-600",
    accentColor: "purple",
    icon: "💆",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      delay: i * 0.08,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
  hover: {
    y: -12,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

export default function TravelPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Animated background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 40, -30, 20, 0],
            y: [0, -50, 30, -40, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-gradient-to-r from-brand/20 to-emerald-300/20 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -40, 30, -20, 0],
            y: [0, 50, -30, 40, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-r from-blue-200/20 to-purple-300/20 blur-3xl"
        />
      </div>

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 overflow-hidden bg-gradient-to-b from-white via-brand-50 to-white px-6 py-20 md:px-12 md:py-28"
      >
        <div className="mx-auto max-w-[1360px]">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8 flex justify-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-gradient-to-r from-brand-surface via-emerald-50 to-brand-surface px-6 py-3 backdrop-blur-sm">
              <span className="text-xl">✨</span>
              <span className="text-sm font-bold text-brand-dark">Odkryj swój idealny styl podróży</span>
            </div>
          </motion.div>

          {/* Main Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mb-12 text-center"
          >
            <h1 className="mb-6 text-[clamp(42px,7vw,72px)] font-black leading-[1.1] tracking-tight">
              <span className="block text-brand-dark">Wybierz swój</span>
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-brand via-emerald-500 to-brand bg-clip-text text-transparent">
                  tryb podróży
                </span>
                <motion.span
                  animate={{ width: ["0%", "100%", "0%"] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                  className="absolute bottom-2 left-0 h-1 bg-gradient-to-r from-transparent via-brand to-transparent opacity-50"
                />
              </span>
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mx-auto max-w-2xl text-lg leading-relaxed text-text-muted md:text-xl"
            >
              Od romantycznych uniesień dla dwojga, po aktywne przygody na szlakach. Znajdź miejsca,
              które idealnie rezonują z Twoją osobowością i marzeniami.
            </motion.p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mb-8 flex justify-center"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block"
            >
              <Link
                href="/ai"
                className="group relative inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-brand to-emerald-500 px-8 py-4 font-bold text-white shadow-[0_12px_32px_rgba(22,163,74,0.35)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(22,163,74,0.45)]"
              >
                <span>Asystent AI</span>
                <motion.span
                  animate={{ x: [0, 6, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="transition-transform"
                >
                  →
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Grid Section */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative z-10 mx-auto max-w-[1360px] px-6 py-20 md:px-12 md:py-28"
      >
        <motion.div variants={itemVariants} className="mb-16 text-center">
          <h2 className="mb-4 text-[clamp(32px,5vw,48px)] font-black leading-tight tracking-tight text-brand-dark">
            9 trybów podróży
          </h2>
          <p className="mx-auto max-w-xl text-lg text-text-muted">
            Każdy typ podróżnika znajdzie tu idealne miejsce. Niezależnie od tego, czy szukasz relaksu, przygody czy
            produktywności.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {TRAVEL_MODES.map((mode, idx) => (
            <motion.div
              key={mode.id}
              custom={idx}
              variants={cardVariants}
              whileHover="hover"
              className="group relative h-full"
            >
              <Link href={`/travel/${mode.id}`} className="block h-full">
                {/* Card Background with gradient */}
                <div
                  className={cn(
                    "relative h-full overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 transition-all duration-500",
                    "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-0 before:transition-opacity before:duration-500 group-hover:before:opacity-100",
                    `before:${mode.gradient}`
                  )}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <motion.div
                      animate={{
                        backgroundPosition: ["200% center", "-200% center"],
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{
                        backgroundImage: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
                        backgroundSize: "200% 100%",
                      }}
                      className="absolute inset-0 rounded-3xl"
                    />
                  </div>

                  {/* Border gradient on hover */}
                  <div
                    className={cn(
                      "absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:shadow-2xl",
                      `shadow-${mode.accentColor}-200`
                    )}
                  />

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Emoji container */}
                    <motion.div
                      initial={{ scale: 1 }}
                      whileHover={{ scale: 1.15, rotate: 12 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={cn(
                        "mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 text-4xl transition-all duration-300",
                        `group-hover:bg-gradient-to-br ${mode.gradient} group-hover:shadow-lg`
                      )}
                    >
                      {mode.emoji}
                    </motion.div>

                    {/* Heading */}
                    <motion.h3
                      className={cn(
                        "mb-3 text-2xl font-black transition-all duration-300",
                        "text-gray-900 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent",
                        `group-hover:${mode.textGradient}`
                      )}
                    >
                      {mode.headline}
                    </motion.h3>

                    {/* Description */}
                    <p className="mb-6 leading-relaxed text-gray-600 transition-colors duration-300 group-hover:text-gray-700">
                      {mode.description}
                    </p>

                    {/* Icon hint */}
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-400 transition-all duration-300 group-hover:text-brand">
                      <span>Odkryj teraz</span>
                      <motion.span
                        initial={{ x: 0 }}
                        whileHover={{ x: 8 }}
                        transition={{ type: "spring", stiffness: 400 }}
                        className="inline-block"
                      >
                        →
                      </motion.span>
                    </div>
                  </div>

                  {/* Accent line */}
                  <motion.div
                    initial={{ width: 0 }}
                    whileHover={{ width: "100%" }}
                    transition={{ duration: 0.4 }}
                    className={cn(
                      "absolute bottom-0 left-0 h-1 bg-gradient-to-r",
                      `from-${mode.accentColor}-400 to-transparent`
                    )}
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative z-10 bg-gradient-to-b from-brand-50 to-white px-6 py-20 md:px-12 md:py-28"
      >
        <div className="mx-auto max-w-[1360px]">
          <motion.div variants={itemVariants} className="mb-16 text-center">
            <h2 className="mb-4 text-[clamp(32px,5vw,48px)] font-black leading-tight tracking-tight text-brand-dark">
              Dlaczego StayMap?
            </h2>
            <p className="mx-auto max-w-xl text-lg text-text-muted">
              Każdy tryb podróży ma dedykowany system rekomendacji
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[
              {
                icon: "🎯",
                title: "Dokładne dopasowanie",
                desc: "AI analizuje każdą ofertę pod kątem Twojego stylu podróży",
              },
              {
                icon: "⚡",
                title: "Superszybo",
                desc: "Natychmiastowe wyszukiwanie i reklama ofert spełniających kryteria",
              },
              {
                icon: "💎",
                title: "Premium oferty",
                desc: "Dostęp do ekskluzywnych i unikalnych miejsc na terenie Polski",
              },
              {
                icon: "🛡️",
                title: "Zaufani partnerzy",
                desc: "Weryfikowani właściciele i bezpieczne rezerwacje",
              },
              {
                icon: "🌟",
                title: "Opinie realne",
                desc: "Szczere recenzje od gości, którzy już odwiedzili miejsca",
              },
              {
                icon: "📱",
                title: "Zawsze dostępne",
                desc: "Pełna funkcjonalność na wszystkich urządzeniach i systemach",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="group rounded-2xl border border-gray-100 bg-white p-8 transition-all duration-300 hover:border-brand hover:shadow-xl"
              >
                <motion.div
                  whileHover={{ scale: 1.15, rotate: 10 }}
                  className="mb-4 inline-block text-4xl transition-transform duration-300"
                >
                  {feature.icon}
                </motion.div>
                <h3 className="mb-2 text-xl font-bold text-brand-dark">{feature.title}</h3>
                <p className="text-gray-600 transition-colors duration-300 group-hover:text-text-secondary">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Final CTA */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative z-10 overflow-hidden bg-gradient-to-r from-brand via-emerald-500 to-brand px-6 py-24 text-center md:px-12"
      >
        <motion.div
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 100%)",
            backgroundSize: "200% 100%",
          }}
        />

        <div className="relative z-10 mx-auto max-w-2xl">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 text-[clamp(32px,5vw,52px)] font-black leading-tight text-white"
          >
            Gotowy na nową przygodę?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-10 text-lg text-white/90"
          >
            Znaleź idealne miejsce, które będzie pasować do Twojego stylu podróży
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col gap-4 sm:flex-row sm:justify-center"
          >
            <Link
              href="/search"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-brand transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
            >
              <span>Szukaj ofert</span>
              <motion.span
                initial={{ x: 0 }}
                whileHover={{ x: 6 }}
                className="transition-transform"
              >
                →
              </motion.span>
            </Link>
            <Link
              href="/ai"
              className="group inline-flex items-center justify-center gap-2 rounded-full border-2 border-white px-8 py-4 font-bold text-white transition-all duration-300 hover:bg-white/10 hover:-translate-y-1"
            >
              <span>StayMap AI</span>
              <motion.span
                initial={{ x: 0 }}
                whileHover={{ x: 6 }}
                className="transition-transform"
              >
                ✨
              </motion.span>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
}
