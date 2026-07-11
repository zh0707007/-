"use client";

import { useEffect, useState } from "react";

import { AccountShell } from "@/components/account-shell";
import { userRequest } from "@/lib/platform/session";
import type { CommunityPostPublic } from "@/types/api";

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPostPublic[]>([]);
  const [title, setTitle] = useState("我的八字学习笔记");
  const [content, setContent] = useState("这里记录一次排盘后的观察与心得。");
  const [message, setMessage] = useState("");

  async function load() {
    const result = await userRequest<CommunityPostPublic[]>("/community/posts");
    if (result.success) {
      setPosts(result.data);
    } else {
      setMessage(result.error.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createPost() {
    const result = await userRequest<CommunityPostPublic>("/community/posts", {
      method: "POST",
      body: JSON.stringify({ content, title, visibility: "public" }),
    });
    if (result.success) {
      setMessage("帖子已发布，可用于后续分享和评论。");
      await load();
    } else {
      setMessage(result.error.message);
    }
  }

  return (
    <AccountShell title="社区分享" description="发布学习笔记、分享排盘心得，并为后续评论社区打基础。">
      <section className="grid gap-4 md:grid-cols-[360px_1fr]">
        <div className="app-card p-5 sm:p-6">
          <h1 className="text-2xl font-semibold">社区分享</h1>
          <div className="mt-5 space-y-4">
            <input
              className="h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 text-white outline-none focus:border-gold"
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
            <textarea
              className="min-h-32 w-full rounded-md border border-white/10 bg-black/20 p-3 text-white outline-none focus:border-gold"
              onChange={(event) => setContent(event.target.value)}
              value={content}
            />
            <button className="app-button w-full bg-gold text-black hover:bg-gold/90" onClick={createPost} type="button">
              发布
            </button>
          </div>
          {message ? <p className="mt-4 rounded-md bg-black/20 p-3 text-sm text-gold">{message}</p> : null}
        </div>
        <div className="app-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold">公开帖子</h2>
          <div className="mt-4 grid gap-3">
            {posts.map((post) => (
              <article className="app-card-muted p-4" key={post.id}>
                <h3 className="font-semibold text-white">{post.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/65">{post.content}</p>
                <p className="mt-2 text-xs text-white/40">
                  评论 {post.commentCount} · 分享地址 {post.shareUrl}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </AccountShell>
  );
}
