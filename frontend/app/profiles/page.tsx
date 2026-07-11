"use client";

import { useEffect, useState } from "react";

import { AccountShell } from "@/components/account-shell";
import { userRequest } from "@/lib/platform/session";
import type { ClientProfilePublic } from "@/types/api";

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<ClientProfilePublic[]>([]);
  const [name, setName] = useState("新档案");
  const [birthSummary, setBirthSummary] = useState("1990-01-01 00:00 北京");
  const [message, setMessage] = useState("");

  async function load() {
    const result = await userRequest<ClientProfilePublic[]>("/profiles");
    if (result.success) {
      setProfiles(result.data);
      setMessage("");
    } else {
      setMessage(result.error.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createProfile() {
    const result = await userRequest<ClientProfilePublic>("/profiles", {
      method: "POST",
      body: JSON.stringify({ birthSummary, gender: "male", name, notes: "", tags: ["客户"] }),
    });
    if (result.success) {
      setMessage("档案已创建。");
      await load();
    } else {
      setMessage(result.error.message);
    }
  }

  return (
    <AccountShell title="多人档案" description="管理个人、客户或家人的命盘档案。">
      <section className="grid gap-4 md:grid-cols-[360px_1fr]">
        <div className="app-card p-5 sm:p-6">
          <h1 className="text-2xl font-semibold">多人档案</h1>
          <div className="mt-5 space-y-4">
            <input
              className="h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 text-white outline-none focus:border-gold"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
            <input
              className="h-11 w-full rounded-md border border-white/10 bg-black/20 px-3 text-white outline-none focus:border-gold"
              onChange={(event) => setBirthSummary(event.target.value)}
              value={birthSummary}
            />
            <button className="app-button w-full bg-gold text-black hover:bg-gold/90" onClick={createProfile} type="button">
              新建档案
            </button>
          </div>
          {message ? <p className="mt-4 rounded-md bg-black/20 p-3 text-sm text-gold">{message}</p> : null}
        </div>
        <div className="app-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold">档案列表</h2>
          <div className="mt-4 grid gap-3">
            {profiles.map((profile) => (
              <div className="app-card-muted p-4 text-sm" key={profile.id}>
                <p className="font-semibold text-white">{profile.name}</p>
                <p className="mt-1 text-white/55">{profile.birthSummary || "未填写出生摘要"}</p>
                <p className="mt-1 text-xs text-white/40">{profile.id}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AccountShell>
  );
}
