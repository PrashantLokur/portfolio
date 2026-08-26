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
          management — mostly attempts to explain my research without the
          notation.
        </p>

        {posts.length === 0 ? (
          <p className="mt-16 text-slate-500">Nothing published yet.</p>
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
