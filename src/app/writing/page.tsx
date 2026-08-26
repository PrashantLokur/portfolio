import Link from "next/link";
import { getAllPosts, formatDate } from "../../lib/posts";

export const metadata = {
  title: "Writing — Prashant Lokur",
  description:
    "Notes on vehicle controls, electrification, and predictive energy management.",
};

export default function WritingIndex() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen bg-[#05070b] text-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <Link
          href="/"
          className="text-sm text-slate-500 transition hover:text-slate-300"
        >
          ← Back to home
        </Link>

        <h1 className="mt-10 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
          Writing
        </h1>
        <p className="mt-6 leading-7 text-slate-400">
          Notes on vehicle controls, electrification, and predictive energy
          management.
        </p>

        {posts.length === 0 ? (
          <div className="mt-20 rounded-3xl border border-white/[0.08] bg-white/[0.02] px-8 py-16 text-center">
            <p className="text-2xl font-semibold tracking-tight text-slate-200">
              Coming soon
            </p>
            <p className="mx-auto mt-4 max-w-md leading-7 text-slate-500">
              First pieces are being written. In the meantime, my published work
              is on{" "}
              <a
                href="https://scholar.google.com/citations?hl=en&user=m1iw9SQAAAAJ"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-300 underline underline-offset-4"
              >
                Google Scholar
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="mt-16 divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {posts.map((post) => (
              <article key={post.slug} className="py-8">
                <Link href={`/writing/${post.slug}`} className="group block">
                  <p className="text-sm text-cyan-300">
                    {formatDate(post.date)}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight transition group-hover:text-cyan-200">
                    {post.title}
                  </h2>
                  {post.summary ? (
                    <p className="mt-3 leading-7 text-slate-400">
                      {post.summary}
                    </p>
                  ) : null}
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
