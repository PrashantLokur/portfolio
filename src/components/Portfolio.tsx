"use client";

import Image from "next/image";
import { useState } from "react";
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
    period: "2021 — Present",
    title: "Doctoral Researcher",
    organization: "Chalmers University of Technology · Geely Technology Europe",
    description:
      "Industrial PhD on predictive thermal and energy management for battery-electric vehicles, developing optimization-based control that holds up under production constraints.",
  },
  {
    period: "2017 — 2021",
    title: "Function Developer",
    organization: "Volvo Cars",
    description:
      "Led function development of route-based energy optimization for plug-in hybrid vehicles, alongside advanced engineering projects, requirements work, and test development. Also served as Scrum Master and acting Product Owner for the team.",
  },
  {
    period: "2015 — 2017",
    title: "Analysis Engineer",
    organization: "Volvo Cars",
    description:
      "Owned system testing for the vehicle dynamics node — verification methods, test plans, design verification, and requirement reviews with internal and external stakeholders.",
  },
  {
    period: "2012 — 2015",
    title: "Early career",
    organization: "Volvo Car Group · Tata Consultancy Services",
    description:
      "Master's thesis on driver modelling for evasive manoeuvre steering assist, using an LQR preview controller and neuromuscular dynamics. Earlier work on battery control module verification and CAD automation.",
  },
];

const publications = [
  {
    year: "2026",
    title:
      "Energy-Optimal Thermal Management of Heat-Pump Battery Electric Vehicles",
    authors: "P. Lokur, N. Murgovski",
    venue: "IEEE Open Journal of Vehicular Technology (in press)",
    type: "Journal article",
  },
  {
    year: "2025",
    title:
      "Control-oriented Model for Thermal Energy Management of Battery Electric Vehicles",
    authors: "P. Lokur, N. Murgovski, M. Larsson",
    venue: "IEEE Transactions on Vehicular Technology, 74(4), 5467–5478",
    type: "Journal article",
  },
  {
    year: "2024",
    title: "Optimizing Thermal Energy Management in BEVs via Distributed Optimization",
    authors: "P. Lokur",
    venue: "Chalmers University of Technology",
    type: "Licentiate thesis",
  },
  {
    year: "2024",
    title:
      "Maximizing the Energy-Saving Potential of Declutchable BEV Powertrains via Eco-Driving",
    authors: "Y. Xu, P. Lokur, S. Klacar et al.",
    venue: "IEEE ESARS-ITEC 2024",
    type: "Conference paper",
  },
  {
    year: "2023",
    title:
      "Distributed Model Predictive Controller for Thermal Energy Management System of Battery Electric Vehicles",
    authors: "P. Lokur, N. Murgovski, K. Nicklasson",
    venue: "IEEE Conference on Decision and Control (CDC), 8363–8368",
    type: "Conference paper",
  },
  {
    year: "2022",
    title:
      "Modeling of the Thermal Energy Management System for Battery Electric Vehicles",
    authors: "P. Lokur, K. Nicklasson, L. Verde et al.",
    venue: "IEEE Vehicle Power and Propulsion Conference (VPPC) 2022",
    type: "Conference paper",
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
  const navItems = [
    { label: "About", href: "/#about" },
    { label: "Experience", href: "/#experience" },
    { label: "Research", href: "/#research" },
    { label: "Writing", href: "/writing" },
    { label: "Contact", href: "/#contact" },
  ];

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
                key={item.label}
                href={item.href}
                className="text-sm text-slate-400 transition hover:text-white"
              >
                {item.label}
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
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block py-3 text-slate-300"
              >
                {item.label}
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
              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold">
                <a
                  href="https://scholar.google.com/citations?hl=en&user=m1iw9SQAAAAJ"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-cyan-300 transition hover:text-cyan-200"
                >
                  Google Scholar <ArrowUpRight size={16} />
                </a>
                <a
                  href="https://research.chalmers.se/en/person/lokur"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-slate-300 transition hover:text-white"
                >
                  Chalmers Research <ArrowUpRight size={16} />
                </a>
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

          <div className="mt-16">
            <h3 className="text-2xl font-semibold tracking-tight">
              Selected publications
            </h3>
            <div className="mt-8 divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {publications.map((pub) => (
                <article
                  key={pub.title}
                  className="grid gap-2 py-7 sm:grid-cols-[6rem_1fr]"
                >
                  <div className="text-sm text-cyan-300">{pub.year}</div>
                  <div>
                    <h4 className="text-lg font-medium leading-7 text-slate-100">
                      {pub.title}
                    </h4>
                    <p className="mt-2 text-sm text-slate-400">{pub.authors}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {pub.venue} · {pub.type}
                    </p>
                  </div>
                </article>
              ))}
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
                href="mailto:prashant.lokur@gmail.com"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-slate-950"
              >
                <Mail size={17} /> Email me
              </a>
              <a
                href="https://www.linkedin.com/in/prashantlokur/"
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
