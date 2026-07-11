"use client";

import { useEffect, useState } from "react";

import { AccountShell } from "@/components/account-shell";
import { userRequest } from "@/lib/platform/session";
import type { OrderPublic } from "@/types/api";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderPublic[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const result = await userRequest<OrderPublic[]>("/orders");
    if (result.success) {
      setOrders(result.data);
      setMessage("");
    } else {
      setMessage(result.error.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AccountShell title="订单系统" description="查看会员购买、机构订阅和后续真实支付流水。">
      <section className="app-card p-5 sm:p-6">
        {message ? <p className="mt-4 rounded-md bg-black/20 p-3 text-sm text-gold">{message}</p> : null}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="text-white/50">
              <tr>
                <th className="border border-white/10 p-3 text-left">订单号</th>
                <th className="border border-white/10 p-3 text-left">商品</th>
                <th className="border border-white/10 p-3">金额</th>
                <th className="border border-white/10 p-3">状态</th>
                <th className="border border-white/10 p-3">支付</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="app-number border border-white/10 p-3">{order.id}</td>
                  <td className="border border-white/10 p-3">{order.productName}</td>
                  <td className="app-number border border-white/10 p-3 text-center">
                    {order.currency} {order.amount}
                  </td>
                  <td className="border border-white/10 p-3 text-center">{order.status}</td>
                  <td className="border border-white/10 p-3 text-center">{order.paymentProvider}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AccountShell>
  );
}
