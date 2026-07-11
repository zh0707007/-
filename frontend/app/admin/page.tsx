"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import { adminRequest, readPlatformSession } from "@/lib/platform/session";
import type { AdminOverview, PlatformSession } from "@/types/api";

export default function AdminPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<PlatformSession | null>(null);

  useEffect(() => {
    async function load() {
      const currentSession = readPlatformSession();
      setSession(currentSession);
      if (currentSession?.user.role !== "admin") {
        setMessage("只有管理员可以查看后台信息。");
        return;
      }
      const result = await adminRequest<AdminOverview>("/overview");
      if (result.success) {
        setOverview(result.data);
        setMessage("");
      } else {
        setMessage(result.error.message);
      }
    }
    load();
  }, []);

  const items = overview
    ? [
        ["用户", overview.users],
        ["机构", overview.tenants],
        ["订单", overview.orders],
        ["已支付订单", overview.paidOrders],
        ["档案", overview.profiles],
        ["帖子", overview.posts],
      ]
    : [];

  return (
    <AdminShell title="管理概览" description="管理员查看平台级用户、机构、订单、档案和社区内容数据。">
      <section className="app-card p-5 sm:p-6">
        <p className="mt-2 text-sm text-white/55">
          {session?.user.role === "admin"
            ? "管理员账号可查看平台概览，后续可扩展用户、订单、内容审核。"
            : "后台信息仅管理员可见。"}
        </p>
        {message ? <p className="mt-4 rounded-md bg-black/20 p-3 text-sm text-gold">{message}</p> : null}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([label, value]) => (
            <div className="app-card-muted p-5" key={label}>
              <p className="text-sm text-white/50">{label}</p>
              <p className="app-number mt-2 text-3xl font-semibold text-gold">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
