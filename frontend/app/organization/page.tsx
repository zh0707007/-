"use client";

import { useEffect, useState } from "react";

import { AccountShell } from "@/components/account-shell";
import { userRequest } from "@/lib/platform/session";
import type { TenantPublic } from "@/types/api";

export default function OrganizationPage() {
  const [tenants, setTenants] = useState<TenantPublic[]>([]);
  const [name, setName] = useState("命理咨询工作室");
  const [message, setMessage] = useState("");

  async function load() {
    const result = await userRequest<TenantPublic[]>("/tenants");
    if (result.success) {
      setTenants(result.data);
      setMessage("");
    } else {
      setMessage(result.error.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createTenant() {
    const result = await userRequest<TenantPublic>("/tenants", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (result.success) {
      setMessage("机构已创建。");
      await load();
    } else {
      setMessage(result.error.message);
    }
  }

  return (
    <AccountShell title="机构与工作区" description="管理用户自己的机构工作区、成员协作和机构版订阅。">
      <section className="app-card p-5 sm:p-6">
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            className="h-11 flex-1 rounded-md border border-white/10 bg-black/20 px-3 text-white outline-none focus:border-gold"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <button className="app-button bg-gold text-black hover:bg-gold/90" onClick={createTenant} type="button">
            创建机构
          </button>
        </div>
        {message ? <p className="mt-4 rounded-md bg-black/20 p-3 text-sm text-gold">{message}</p> : null}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {tenants.map((tenant) => (
            <div className="app-card-muted p-4 text-sm" key={tenant.id}>
              <p className="font-semibold text-white">{tenant.name}</p>
              <p className="mt-1 text-white/55">套餐：{tenant.plan}，状态：{tenant.status}</p>
              <p className="mt-1 text-xs text-white/40">{tenant.id}</p>
            </div>
          ))}
        </div>
      </section>
    </AccountShell>
  );
}
