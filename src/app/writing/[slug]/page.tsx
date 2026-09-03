import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { getAllPosts, getPost, formatDate } from "../../../lib/posts";

const siteUrl = "https://www.prashantlokur.com";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const url = `${siteUrl}/writing/${post.slug}`;

  return {
    title: `${post.title} — Prashant Lokur`,
    description: post.summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.summary,
      siteName: "Prashant Lokur",
      publishedTime: post.date || undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
    },
  };
}

const proseStyles = [
  "mt-14 max-w-none text-slate-300",
  "[&_h2]:mt-14 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-white",
  "[&_h3]:mt-10 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white",
  "[&_p]:mt-6 [&_p]:leading-8",
  "[&_ul]:mt-6 [&_ul]:list-disc [&_ul]:pl-6",
  "[&_ol]:mt-6 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_li]:mt-2 [&_li]:leading-8",
  "[&_a]:text-cyan-300 [&_a]:underline [&_a]:underline-offset-4",
  "[&_strong]:font-semibold [&_strong]:text-white",
  "[&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em]",
  "[&_pre]:mt-6 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-white/[0.08] [&_pre]:bg-white/[0.03] [&_pre]:p-5",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_blockquote]:mt-6 [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-300/40 [&_blockquote]:pl-5 [&_blockquote]:text-slate-400",
  "[&_hr]:mt-12 [&_hr]:border-white/10",
  "[&_img]:mt-8 [&_img]:rounded-2xl",
].join(" ");

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) notFound();

  const html = await marked.parse(post.content);

  return (
    <main className="min-h-screen bg-[#05070b] text-slate-50">
      <article className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <Link
          href="/writing"
          className="text-sm text-slate-500 transition hover:text-slate-300"
        >
          ← All writing
        </Link>

        <p className="mt-10 text-sm text-cyan-300">{formatDate(post.date)}</p>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
          {post.title}
        </h1>

        <div
          className={proseStyles}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div className="mt-20 flex flex-wrap items-center gap-4 border-t border-white/[0.08] pt-8">
          <span className="text-sm text-slate-500">Share this</span>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
              `${siteUrl}/writing/${post.slug}`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-300/50 hover:text-white"
          >
            LinkedIn
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(
              post.title
            )}&body=${encodeURIComponent(`${siteUrl}/writing/${post.slug}`)}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-300/50 hover:text-white"
          >
            Email
          </a>
        </div>
      </article>
    </main>
  );
}
