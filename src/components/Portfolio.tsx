"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowDown,
  ArrowUpRight,
  BrainCircuit,
  Cpu,
  Gauge,
  Mail,
  MapPin,
  Menu,
  Thermometer,
  X,
} from "lucide-react";

const experience = [
  {
    period: "Current",
    title: "Industrial PhD Researcher",
    organization: "Chalmers University of Technology × ZEEKR",
    description:
      "Researching intelligent thermal and energy management for battery-electric vehicles, connecting advanced control theory with production-focused engineering.",
  },
  {
    period: "Previously",
    title: "Controls Engineer",
    organization: "Volvo Cars",
    description:
      "Developed and integrated automotive control functions across modeling, software implementation, calibration, verification, and vehicle-level validation.",
  },
  {
    period: "11+ years",
    title: "Automotive Engineering",
    organization: "Controls · Electrification · Embedded Systems",
    description:
      "A career spanning control algorithm development, system modeling, embedded implementation, and multidisciplinary vehicle integration.",
  },
];

const expertise = [
  {
    icon: Thermometer,
    title: "BEV thermal management",
    copy: "Coordinating battery, cabin, and powertrain thermal demands under real-world constraints.",
  },
  {
    icon: BrainCircuit,
    title: "Model Predictive Control",
    copy: "Using prediction and optimization to make energy-aware decisions over a future horizon.",
  },
  {
    icon: Gauge,
    title: "Energy management",
    copy: "Balancing efficiency, performance, comfort, component protection, and range.",
  },
  {
    icon: Cpu,
    title: "Embedded controls",
    copy: "Turning algorithms into robust, testable, production-oriented vehicle software.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
      {children}
    </p>
  );
}

function LinkedInIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.32 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.1 20.45H3.54V9H7.1v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z" />
    </svg>
  );
}

export default function Portfolio() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [ambient, setAmbient] = useState(10);
  const [power, setPower] = useState(180);
  const [cooling, setCooling] = useState(55);

  const demo = useMemo(() => {
    const estimatedTemperature = Math.max(
      -10,
      Math.min(65, ambient + power * 0.115 - cooling * 0.22)
    );
    const coolingDemand = Math.max(
      0,
      Math.min(100, (estimatedTemperature - 22) * 3.5)
    );
    const efficiency = Math.max(
      82,
      Math.min(99, 98 - Math.abs(estimatedTemperature - 28) * 0.28)
    );

    return {
      temperature: estimatedTemperature,
      demand: coolingDemand,
      efficiency,
    };
  }, [ambient, power, cooling]);

  const navItems = ["About", "Experience", "Research", "Playground", "Contact"];

  return (
    <main className="overflow-hidden bg-[#05070b] text-slate-50">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#05070b]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="#top" className="font-semibold tracking-tight">
            PL<span className="text-cyan-300">.</span>
          </a>

          <div className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm text-slate-400 transition hover:text-white"
              >
                {item}
              </a>
            ))}
          </div>

          <button
            className="rounded-lg p-2 text-slate-300 md:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/5 bg-[#05070b] px-6 py-5 md:hidden">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
                className="block py-3 text-slate-300"
              >
                {item}
              </a>
            ))}
          </div>
        )}
      </nav>

      <section id="top" className="relative min-h-screen pt-16">
        <div className="grid-noise absolute inset-0" />
        <div className="absolute left-1/2 top-24 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[120px]" />

        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-14 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
            >
              <SectionLabel>Vehicle intelligence · Electrification</SectionLabel>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.08 }}
              className="text-balance mt-7 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl lg:text-[5.4rem]"
            >
              Designing the intelligence behind{" "}
              <span className="text-cyan-300">electric vehicles.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="mt-8 max-w-2xl text-lg leading-8 text-slate-400"
            >
              I’m Prashant Lokur—an automotive controls engineer and Industrial
              PhD researcher focused on BEV thermal management, energy
              optimization, model predictive control, and embedded vehicle systems.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <a
                href="#experience"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Explore my work <ArrowDown size={17} />
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 font-semibold text-white transition hover:border-white/35 hover:bg-white/5"
              >
                Start a conversation <ArrowUpRight size={17} />
              </a>
            </motion.div>

            <div className="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-500">
              <span>11+ years in automotive engineering</span>
              <span>Gothenburg, Sweden</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="relative mx-auto aspect-square w-full max-w-[520px]"
          >
            <div className="absolute inset-[4%] rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute inset-[8%] rounded-full border border-cyan-300/15" />
            <motion.div
              className="absolute inset-[3%] rounded-full border border-dashed border-cyan-200/15"
              animate={{ rotate: 360 }}
              transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
            />

            <div className="absolute inset-[13%] overflow-hidden rounded-full border border-white/10 bg-slate-900 shadow-2xl shadow-cyan-950/40">
              <Image
                src="/images/prashant.png"
                alt="Prashant Lokur"
                fill
                priority
                sizes="(max-width: 1024px) 80vw, 480px"
                className="object-cover object-[50%_28%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/28 via-transparent to-transparent" />
            </div>

            {[
              ["MPC", "left-[0%] top-[43%]"],
              ["THERMAL", "right-[-2%] top-[25%]"],
              ["ENERGY", "bottom-[8%] left-[14%]"],
              ["CONTROL", "bottom-[11%] right-[0%]"],
            ].map(([label, position], index) => (
              <motion.div
                key={label}
                className={`absolute ${position} rounded-full border border-white/10 bg-slate-950/85 px-4 py-2 text-[11px] font-semibold tracking-[0.18em] text-slate-300 backdrop-blur`}
                animate={{ y: [0, -7, 0] }}
                transition={{
                  duration: 4 + index * 0.45,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {label}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="about" className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>About</SectionLabel>
          <div className="mt-8 grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <h2 className="text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
              Advanced control theory, grounded in real vehicle engineering.
            </h2>
            <div className="space-y-6 text-lg leading-8 text-slate-400">
              <p>
                My work sits at the intersection of system modeling, optimization,
                controls, embedded implementation, and vehicle integration.
              </p>
              <p>
                I focus on converting complex physical and operational constraints
                into control strategies that improve efficiency, robustness,
                comfort, performance, and component protection.
              </p>
              <p>
                The objective is not only to develop a clever algorithm—it is to
                make the complete system work.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {expertise.map(({ icon: Icon, title, copy }) => (
              <motion.article
                key={title}
                whileHover={{ y: -6 }}
                className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6"
              >
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-300">
                  <Icon size={22} />
                </div>
                <h3 className="mt-8 text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{copy}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="experience" className="border-t border-white/5 bg-white/[0.018] py-28">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>Experience</SectionLabel>
          <div className="mt-8 grid gap-14 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <h2 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                From production controls to next-generation research.
              </h2>
              <p className="mt-6 leading-7 text-slate-400">
                A multidisciplinary career connecting automotive product
                development with research in intelligent electrified-vehicle systems.
              </p>
            </div>

            <div className="space-y-4">
              {experience.map((item, index) => (
                <article
                  key={item.title}
                  className="grid gap-4 rounded-3xl border border-white/[0.08] bg-[#080b11] p-6 sm:grid-cols-[110px_1fr]"
                >
                  <div className="text-sm font-medium text-cyan-300">{item.period}</div>
                  <div>
                    <p className="text-sm text-slate-500">0{index + 1}</p>
                    <h3 className="mt-3 text-2xl font-semibold">{item.title}</h3>
                    <p className="mt-1 text-slate-300">{item.organization}</p>
                    <p className="mt-5 leading-7 text-slate-400">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="research" className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>Research & intellectual property</SectionLabel>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-cyan-300/[0.09] to-transparent p-8 sm:p-10">
              <p className="text-sm text-cyan-300">Industrial PhD</p>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight">
                Predictive thermal and energy management for BEVs
              </h2>
              <p className="mt-5 leading-7 text-slate-400">
                Researching methods that coordinate thermal systems and vehicle
                energy flows using prediction, optimization, and system-level
                intelligence.
              </p>
              <div className="mt-10 inline-flex items-center gap-2 text-sm font-semibold">
                Publications coming soon <ArrowUpRight size={16} />
              </div>
            </article>

            <article className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-8 sm:p-10">
              <p className="text-sm text-blue-300">Published patent application</p>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight">
                Dynamic routing system for selecting charging stations
              </h2>
              <p className="mt-5 leading-7 text-slate-400">
                Inventor on work related to intelligent EV charging-stop selection,
                route planning, battery considerations, availability, and dynamic
                journey adaptation.
              </p>
              <div className="mt-10 text-sm font-semibold text-slate-200">
                US 2025/0198782 A1
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="playground" className="border-t border-white/5 bg-white/[0.018] py-28">
        <div className="mx-auto max-w-7xl px-6">
          <SectionLabel>Engineering playground</SectionLabel>
          <div className="mt-8 grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <h2 className="text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                Explore a simplified battery thermal-control model.
              </h2>
              <p className="mt-6 leading-7 text-slate-400">
                This illustrative demo shows how ambient conditions, charging
                power, and commanded cooling can affect an estimated battery
                temperature and efficiency window. It is educational—not a
                production vehicle model.
              </p>

              <div className="mt-10 space-y-7">
                <label className="block">
                  <div className="mb-3 flex justify-between text-sm">
                    <span className="text-slate-300">Ambient temperature</span>
                    <span className="font-mono text-cyan-300">{ambient}°C</span>
                  </div>
                  <input
                    type="range"
                    min={-20}
                    max={45}
                    value={ambient}
                    onChange={(event) => setAmbient(Number(event.target.value))}
                    className="w-full accent-cyan-300"
                  />
                </label>

                <label className="block">
                  <div className="mb-3 flex justify-between text-sm">
                    <span className="text-slate-300">Charging power</span>
                    <span className="font-mono text-cyan-300">{power} kW</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={350}
                    value={power}
                    onChange={(event) => setPower(Number(event.target.value))}
                    className="w-full accent-cyan-300"
                  />
                </label>

                <label className="block">
                  <div className="mb-3 flex justify-between text-sm">
                    <span className="text-slate-300">Cooling command</span>
                    <span className="font-mono text-cyan-300">{cooling}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cooling}
                    onChange={(event) => setCooling(Number(event.target.value))}
                    className="w-full accent-cyan-300"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/[0.08] bg-[#080b11] p-6 sm:p-9">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Estimated temperature", `${demo.temperature.toFixed(1)}°C`],
                  ["Cooling demand", `${demo.demand.toFixed(0)}%`],
                  ["Estimated efficiency", `${demo.efficiency.toFixed(1)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/[0.04] p-5">
                    <p className="text-xs leading-5 text-slate-500">{label}</p>
                    <p className="mt-3 text-2xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-3xl border border-white/[0.06] bg-slate-950 p-6">
                <div className="flex h-64 items-end gap-3">
                  {[14, 21, 31, 43, 57, 72, 63, 49, 38, 30, 26, 22].map(
                    (height, index) => (
                      <motion.div
                        key={index}
                        className="flex-1 rounded-t bg-gradient-to-t from-blue-500/35 to-cyan-300"
                        animate={{
                          height: `${Math.max(
                            12,
                            Math.min(92, height + demo.temperature * 0.45)
                          )}%`,
                        }}
                        transition={{ duration: 0.45 }}
                      />
                    )
                  )}
                </div>
                <div className="mt-5 flex justify-between text-xs text-slate-600">
                  <span>Start</span>
                  <span>Thermal response over time</span>
                  <span>Horizon</span>
                </div>
              </div>

              <p className="mt-5 text-xs leading-5 text-slate-600">
                Simplified illustrative equations. No proprietary data or control
                logic is represented.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="border-t border-white/5 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-[2.2rem] border border-white/[0.08] bg-gradient-to-br from-cyan-300/[0.08] via-white/[0.025] to-blue-500/[0.08] px-7 py-14 text-center sm:px-14">
            <SectionLabel>Contact</SectionLabel>
            <h2 className="text-balance mx-auto mt-7 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Let’s build more intelligent, efficient vehicles.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl leading-7 text-slate-400">
              I write and think about advanced vehicle controls, electrification,
              and predictive energy management. Always glad to discuss the
              technical problems in this space, or to hear from others working
              on them.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a
                href="mailto:hello@prashantlokur.com"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-slate-950"
              >
                <Mail size={17} /> Email me
              </a>
              <a
                href="REPLACE_WITH_YOUR_LINKEDIN_URL"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 font-semibold"
              >
                <LinkedInIcon /> LinkedIn
              </a>
            </div>
            <div className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-500">
              <MapPin size={15} /> Gothenburg, Sweden
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Prashant Lokur</p>
          <p>Controls · Electrification · Research</p>
        </div>
      </footer>
    </main>
  );
}
