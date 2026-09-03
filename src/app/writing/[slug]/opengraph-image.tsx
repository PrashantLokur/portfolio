import { ImageResponse } from "next/og";
import { getPost, getAllPosts, formatDate } from "../../../lib/posts";

export const alt = "Writing by Prashant Lokur";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default async function PostOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  const title = post?.title ?? "Writing";
  const date = post?.date ? formatDate(post.date) : "";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#05070b",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#67e8f9",
            }}
          >
            {date ? `Writing · ${date}` : "Writing"}
          </div>
          <div
            style={{
              marginTop: 44,
              fontSize: title.length > 60 ? 60 : 74,
              fontWeight: 700,
              color: "#f8fafc",
              letterSpacing: "-0.03em",
              lineHeight: 1.12,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 28,
            color: "#64748b",
          }}
        >
          <div style={{ display: "flex" }}>Prashant Lokur</div>
          <div style={{ display: "flex" }}>prashantlokur.com</div>
        </div>
      </div>
    ),
    size
  );
}
