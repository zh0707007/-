"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api/client";
import { clearPlatformSession, readPlatformSession, writePlatformSession } from "@/lib/platform/session";
import type { AuthSession } from "@/types/api";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [session, setSession] = useState(readPlatformSession());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = mode === "login" ? "登录账号" : "创建账号";
  const helper = useMemo(
    () =>
      mode === "login"
        ? "输入你注册时使用的邮箱和密码。还没有账号可以立即注册。"
        : "创建账号后会自动登录，并进入首页排盘。",
    [mode]
  );

  function switchMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setMessage("");
  }

  function logout() {
    clearPlatformSession();
    setSession(null);
    setMessage("已退出登录。");
  }

  async function loginWithPassword() {
    const loginResult = await apiRequest<AuthSession>("/user/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!loginResult.success) {
      setMessage(`${loginResult.error.message} 如果还没有账号，请先注册。`);
      return false;
    }
    writePlatformSession(loginResult.data);
    setSession(loginResult.data);
    setMessage("登录成功，正在进入首页。");
    router.replace("/");
    return true;
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setMessage("");
    try {
      if (mode === "register") {
        const registerResult = await apiRequest<{ user: unknown }>("/user/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, name, password }),
        });
        if (!registerResult.success) {
          if (registerResult.error.code === "EMAIL_EXISTS") {
            setMode("login");
            setMessage("该邮箱已经注册，请直接登录。");
          } else {
            setMessage(registerResult.error.message);
          }
          return;
        }
      }
      await loginWithPassword();
    } catch {
      setMessage("无法连接后端服务，请确认 FastAPI 已启动。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-frame justify-center">
      <section className="app-card mx-auto grid w-full max-w-5xl overflow-hidden md:grid-cols-[0.9fr_1.1fr]">
        <aside className="bg-black/20 p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gold text-lg font-semibold text-black shadow-[0_8px_22px_rgba(151,103,30,0.26)]">
            命
          </div>
          <h1 className="mt-6 text-3xl font-semibold leading-tight">八字测算平台</h1>
          <p className="mt-3 max-w-md text-sm leading-7 text-white/60">
            登录后可以进入首页排盘，保存多人档案，生成 AI 解读与 PDF 报告，并使用会员、订单和社区功能。
          </p>
          {session ? (
            <div className="mt-6 rounded-md border border-gold/30 bg-gold/10 p-4 text-sm text-gold">
              <p>当前已登录：{session.user.name}</p>
              <p className="mt-1 text-xs">{session.user.email}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="app-button bg-gold text-black" onClick={() => router.replace("/")} type="button">
                  进入首页
                </button>
                <button className="app-button border border-gold/40" onClick={logout} type="button">
                  退出
                </button>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-white/55">{helper}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 rounded-md border border-white/10 bg-black/20 p-1">
            <button
              className={`h-10 rounded text-sm ${mode === "login" ? "bg-gold text-black" : "text-white/60"}`}
              onClick={() => switchMode("login")}
              type="button"
            >
              登录
            </button>
            <button
              className={`h-10 rounded text-sm ${mode === "register" ? "bg-gold text-black" : "text-white/60"}`}
              onClick={() => switchMode("register")}
              type="button"
            >
              注册
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {mode === "register" ? (
              <label className="block text-sm text-white/70">
                昵称
                <input
                  className="mt-2 h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 text-white outline-none focus:border-gold"
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="请输入昵称"
                  value={name}
                />
              </label>
            ) : null}
            <label className="block text-sm text-white/70">
              邮箱
              <input
                className="mt-2 h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 text-white outline-none focus:border-gold"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                value={email}
              />
            </label>
            <label className="block text-sm text-white/70">
              密码
              <input
                className="mt-2 h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 text-white outline-none focus:border-gold"
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === "register" ? "至少 8 位" : "请输入密码"}
                type="password"
                value={password}
              />
            </label>
          </div>

          {message ? <p className="mt-4 rounded-md bg-black/20 p-3 text-sm text-gold">{message}</p> : null}

          <button
            className="app-button mt-5 w-full bg-gold text-black disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !email.trim() || !password.trim() || (mode === "register" && !name.trim())}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? "处理中..." : mode === "login" ? "登录并进入首页" : "注册并进入首页"}
          </button>

          <p className="mt-4 text-center text-sm text-white/55">
            {mode === "login" ? "还没有账号？" : "已有账号？"}
            <button
              className="ml-1 text-gold underline underline-offset-4"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
              type="button"
            >
              {mode === "login" ? "立即注册" : "直接登录"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
