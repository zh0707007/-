"use client";

import { useEffect, useState } from "react";

import { AccountShell } from "@/components/account-shell";
import { userRequest } from "@/lib/platform/session";
import type { MembershipPlan, MembershipPublic, OrderPublic } from "@/types/api";

export default function MemberPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [membership, setMembership] = useState<MembershipPublic | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const [planResult, membershipResult] = await Promise.all([
      userRequest<MembershipPlan[]>("/membership/plans"),
      userRequest<MembershipPublic>("/membership/current"),
    ]);
    if (planResult.success) {
      setPlans(planResult.data);
    }
    if (membershipResult.success) {
      setMembership(membershipResult.data);
    } else {
      setMessage(membershipResult.error.message);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function buy(plan: MembershipPlan) {
    const orderResult = await userRequest<OrderPublic>("/orders", {
      method: "POST",
      body: JSON.stringify({ productCode: plan.code }),
    });
    if (!orderResult.success) {
      setMessage(orderResult.error.message);
      return;
    }
    const payResult = await userRequest<OrderPublic>(`/orders/${orderResult.data.id}/mock-pay`, {
      method: "POST",
    });
    setMessage(payResult.success ? "模拟支付成功，会员已更新。" : payResult.error.message);
    await load();
  }

  return (
    <AccountShell title="会员中心" description="管理套餐、额度和支付状态，当前支付为模拟支付。">
      <section className="app-card p-5 sm:p-6">
        <div className="app-card-muted flex flex-col gap-3 p-4 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
          {membership ? (
            <>
              <div>
                <p className="text-xs text-white/45">当前会员</p>
                <p className="mt-1 text-lg font-semibold text-white">{membership.tier}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:text-right">
                <div>
                  <p className="text-xs text-white/45">状态</p>
                  <p className="mt-1 font-semibold text-gold">{membership.status}</p>
                </div>
                <div>
                  <p className="text-xs text-white/45">剩余额度</p>
                  <p className="app-number mt-1 font-semibold text-white">{membership.quota}</p>
                </div>
              </div>
            </>
          ) : (
            <p>{isLoading ? "加载中..." : "未获取到会员信息"}</p>
          )}
        </div>

        {message ? <p className="mt-4 rounded-md bg-black/20 p-3 text-sm text-gold">{message}</p> : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {plans.map((plan, index) => (
            <div className="flex min-h-[260px] flex-col rounded-lg border border-white/10 bg-black/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]" key={plan.code}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-gold">{index === 0 ? "个人常用" : "机构推荐"}</p>
                  <h2 className="mt-2 text-xl font-semibold">{plan.name}</h2>
                </div>
                <span className="rounded-md bg-gold/15 px-2 py-1 text-xs font-semibold text-gold">{plan.quota} 次</span>
              </div>
              <p className="app-number mt-4 text-3xl font-semibold text-gold">
                {plan.currency} {plan.price}
              </p>
              <p className="mt-3 flex-1 text-sm leading-7 text-white/60">{plan.description}</p>
              <p className="mt-3 text-sm text-white/50">包含 AI 解读与 PDF 报告额度：{plan.quota}</p>
              <button
                className="app-button mt-5 w-full bg-gold text-black hover:bg-gold/90"
                onClick={() => buy(plan)}
                type="button"
              >
                创建订单并模拟支付
              </button>
            </div>
          ))}
        </div>
      </section>
    </AccountShell>
  );
}
