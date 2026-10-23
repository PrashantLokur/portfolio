import Link from "next/link";
import type { Metadata } from "next";
import { DaylightTool } from "../../components/daylight/DaylightTool";

const title = "Daylight and ventilation check for your flat";
const description =
  "Upload a floor plan, trace the rooms and windows, and see how sunlight and wind move through the flat across the day and the seasons. Runs in your browser; nothing is uploaded.";

export const metadata: Metadata = {
  title: `${title} — Prashant Lokur`,
  description,
  alternates: { canonical: "/daylight" },
  openGraph: {
    title,
    description,
    url: "/daylight",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function DaylightPage() {
  return (
    <main className="min-h-screen bg-[#05070b] text-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <Link href="/" className="text-sm text-slate-500 transition hover:text-slate-300">
          ← Back to home
        </Link>

        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Side project · Building physics</p>
        <h1 className="text-balance mt-4 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl">
          Daylight and airflow in <span className="text-cyan-300">your flat</span>
        </h1>
        <p className="mt-5 max-w-3xl leading-7 text-slate-400">
          Upload a floor plan, trace the rooms and windows, give the address and floor, and see how the sun moves through the rooms during the day and how wind
          flows through them in each season. Everything runs in your browser: your plan image is never uploaded.
        </p>

        <div className="mt-10">
          <DaylightTool />
        </div>
      </div>
    </main>
  );
}
