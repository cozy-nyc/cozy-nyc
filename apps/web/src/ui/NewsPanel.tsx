import { useState } from "react";
import { NEWS } from "../mock/news";
import { day } from "./format";
import { Icon } from "./icons";

export function NewsPanel({ onClose }: { onClose(): void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const post = NEWS.find((p) => p.id === openId);

  return (
    <section className="panel side" aria-label="News and blog">
      <header className="panel-head">
        {post && (
          <button className="icon-btn ghost" onClick={() => setOpenId(null)} aria-label="Back to all posts">
            <Icon name="back" size={18} />
          </button>
        )}
        <h2>news</h2>
        <button className="icon-btn ghost" onClick={onClose} aria-label="Close news">
          <Icon name="close" size={18} />
        </button>
      </header>
      {post ? (
        <article className="article">
          <time dateTime={post.date}>{day(post.date)}</time>
          <h3>{post.title}</h3>
          {post.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </article>
      ) : (
        <ul className="news-list">
          {NEWS.map((p) => (
            <li key={p.id}>
              <button onClick={() => setOpenId(p.id)}>
                <time dateTime={p.date}>{day(p.date)}</time>
                <strong>{p.title}</strong>
                <span>{p.excerpt}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
