"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { NavIcon, type NavIconName } from "@/components/nav-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { clearPlatformSession, readPlatformSession } from "@/lib/platform/session";
import type { PlatformSession } from "@/types/api";

const accountLinks: { description: string; href: string; icon: NavIconName; label: string }[] = [
  { href: "/member", icon: "member", label: "会员中心", description: "套餐与额度" },
  { href: "/profiles", icon: "profile", label: "多人档案", description: "客户与家人命盘" },
  { href: "/orders", icon: "order", label: "订单记录", description: "购买与支付" },
  { href: "/organization", icon: "organization", label: "机构工作区", description: "团队与租户" },
  { href: "/community", icon: "community", label: "社区分享", description: "笔记与评论" },
];

type AccountShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AccountShell({ title, description, children }: AccountShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<PlatformSession | null>(null);

  useEffect(() => {
    const currentSession = readPlatformSession();
    setSession(currentSession);
    if (!currentSession) {
      router.replace("/auth");
    }
  }, [router]);

  function logout() {
    clearPlatformSession();
    router.replace("/auth");
  }

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[296px_1fr]">
      <aside className="flex border-white/10 bg-[#f1f3f7] text-[#1f2937] shadow-[inset_-1px_0_0_rgba(99,78,44,0.14)] lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:overflow-y-auto">
        <div className="flex min-w-0 flex-1 flex-col lg:min-h-screen">
          <div className="flex items-center gap-3 border-b border-black/10 px-5 py-5 lg:flex-col lg:items-center lg:px-8 lg:py-12 lg:text-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold text-lg font-semibold text-black shadow-[0_8px_22px_rgba(151,103,30,0.22)]">
              命
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold lg:mt-4 lg:whitespace-normal">八字测算账户中心</h1>
              <p className="mt-1 truncate text-xs text-black/45 lg:whitespace-normal">排盘、会员、档案、订单和社区</p>
              <p className="mt-2 hidden text-xs text-black/45 lg:block">{session?.user.email || "请先登录"}</p>
            </div>
          </div>

          <nav className="min-w-0 flex-1 overflow-x-auto border-b border-black/10 px-4 py-4 lg:overflow-visible lg:border-b-0 lg:px-5 lg:py-6">
            <p className="mb-4 hidden text-[15px] font-medium text-black/70 lg:block">导航菜单</p>
            <div className="flex w-max gap-2 lg:grid lg:w-auto lg:gap-1">
              <Link
                className="flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] font-medium text-black/70 transition-[background-color,color,transform] duration-150 hover:bg-white/70 hover:text-gold active:scale-95 lg:min-h-12"
                href="/"
              >
                <span className="h-4 w-4 rounded-full border border-black/20 bg-white" />
                <span className="flex min-w-[112px] items-center gap-2 lg:min-w-0">
                  <NavIcon name="home" />
                  <span className="whitespace-nowrap">排盘首页</span>
                </span>
              </Link>
            {accountLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] font-medium transition-[background-color,color,transform] duration-150 active:scale-95 lg:min-h-12 ${
                    active ? "bg-white text-gold shadow-[0_8px_20px_rgba(31,41,55,0.08)]" : "text-black/70 hover:bg-white/70 hover:text-gold"
                  }`}
                  href={link.href}
                  key={link.href}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? "border-gold bg-gold" : "border-black/20 bg-white"}`}>
                    {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                  </span>
                  <span className="flex min-w-[112px] items-center gap-2 lg:min-w-0">
                    <NavIcon active={active} name={link.icon} />
                    <span className="whitespace-nowrap">{link.label}</span>
                  </span>
                </Link>
              );
            })}
            </div>
          </nav>

          <div className="hidden border-t border-black/10 px-8 py-6 text-xs text-black/40 lg:block">
            <p>v1.0.0 · 八字测算平台</p>
            <button className="mt-4 w-full rounded-md border border-black/10 px-3 py-2 text-sm text-black/55 transition hover:border-gold/40 hover:text-gold active:scale-95" onClick={logout} type="button">
              退出登录
            </button>
          </div>
        </div>
      </aside>

      <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-10">
        <header className="mb-5 flex min-h-12 flex-wrap items-center justify-end gap-2">
          <Link className="app-button border border-white/10 text-white/70 hover:border-gold/40 hover:text-gold" href="/">
            排盘首页
          </Link>
          {session?.user.role === "admin" ? (
            <Link className="app-button border border-gold/40 text-gold hover:bg-gold hover:text-black" href="/admin">
              管理端
            </Link>
          ) : null}
          <ThemeToggle variant="nav" />
        </header>

        <div className="app-card mb-5 overflow-hidden">
          <div className="bg-gradient-to-r from-[rgb(103,75,30)] to-[rgb(151,103,30)] p-6 text-[rgb(255,255,255)] shadow-[0_18px_45px_rgba(75,57,25,0.18)] sm:p-8">
            <p className="text-sm font-semibold text-[rgba(255,255,255,0.82)]">账户工作台</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight">{title}</h2>
            <div className="mt-5 flex flex-col gap-3 text-sm leading-6 text-[rgba(255,255,255,0.82)] sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-3xl">{description}</p>
              <span className="w-max rounded-md bg-white/15 px-3 py-2 text-xs">{session ? "已登录" : "未登录"}</span>
            </div>
          </div>
        </div>

        {children}
      </section>
    </main>
  );
}
