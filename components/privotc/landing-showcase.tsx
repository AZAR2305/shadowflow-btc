"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Lock, ShieldCheck, Sparkles, Workflow } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const cards = [
  {
    title: "Confidential Intent Layer",
    text: "BTC wallet users submit OTC intents without exposing full strategy details pre-match.",
    icon: Lock,
    bg: "bg-[#FFF3D9]",
  },
  {
    title: "Proof-Aware Matching",
    text: "ZK and attestation signals are surfaced through backend lifecycle endpoints.",
    icon: Sparkles,
    bg: "bg-[#E6F2FF]",
  },
  {
    title: "Starknet-Compatible Settlement",
    text: "Architecture is designed for Starknet privacy-track execution and settlement scale.",
    icon: ShieldCheck,
    bg: "bg-[#E9FFE9]",
  },
  {
    title: "Operator Workflow Visibility",
    text: "Trades, matches, logs, proofs, and chain-state are all monitorable in dedicated pages.",
    icon: Workflow,
    bg: "bg-[#FFE6EB]",
  },
];

export function LandingShowcase() {
  return (
    <section className="container mx-auto px-4 pb-16 pt-4 md:pt-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease }}
          className="surface-strong p-8 md:p-10"
        >
          <p className="inline-flex rounded-full border border-[#c8d8ea] bg-[#eef6ff] px-4 py-1 text-xs font-bold uppercase tracking-wide text-[#0f3e6d]">
            ShadowFlow Starknet Basis
          </p>
          <h1 className="mt-4 text-center text-4xl font-bold leading-tight md:text-6xl">
            Private BTC OTC
            <span className="block text-[#0f4f87]">with Starknet Verification</span>
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-7 text-[#333] md:text-base">
            Human-aware confidential Bitcoin OTC architecture with Starknet-compatible privacy execution.
            Keep intent details private, verify critical state, and monitor settlement transparency.
          </p>

          <div className="mx-auto mt-7 max-w-4xl rounded-2xl border border-[#d3dfec] bg-[#f8fbff] p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-[#cfdded] bg-white p-3 text-center text-xs font-bold uppercase tracking-wide">Wallet Connect</div>
              <div className="rounded-xl border border-[#cfdded] bg-white p-3 text-center text-xs font-bold uppercase tracking-wide">Intent + Proof</div>
              <div className="rounded-xl border border-[#cfdded] bg-white p-3 text-center text-xs font-bold uppercase tracking-wide">Match + Settle</div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/otc-intent"
              className="inline-flex items-center gap-2 rounded-xl bg-[#10253f] px-6 py-3 text-sm font-semibold text-white"
            >
              Launch OTC Intent
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-2 rounded-xl border border-[#b7c9df] bg-white px-6 py-3 text-sm font-semibold text-[#172a42]"
            >
              View Transactions
            </Link>
            <Link
              href="/swap-matching"
              className="inline-flex items-center gap-2 rounded-xl border border-[#b7c9df] bg-[#eaf4ff] px-6 py-3 text-sm font-semibold text-[#0f3e6d]"
            >
              Open Match Terminal
            </Link>
          </div>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease, delay: idx * 0.08 }}
                className={`surface-card p-5 ${card.bg}`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-[#bccde1] bg-white p-2">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-bold">{card.title}</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#2f2f2f]">{card.text}</p>
              </motion.article>
            );
          })}
        </div>

        <div className="surface-card overflow-hidden bg-white">
          <div className="animate-marquee whitespace-nowrap py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#4b4b4b]">
            <span className="mx-8">Starknet Privacy Track</span>
            <span className="mx-8">BTC OTC Confidential Execution</span>
            <span className="mx-8">ZK Proof Flow</span>
            <span className="mx-8">Intent Matching Lifecycle</span>
            <span className="mx-8">TEE Attestation Monitoring</span>
            <span className="mx-8">Starknet Privacy Track</span>
            <span className="mx-8">BTC OTC Confidential Execution</span>
            <span className="mx-8">ZK Proof Flow</span>
            <span className="mx-8">Intent Matching Lifecycle</span>
            <span className="mx-8">TEE Attestation Monitoring</span>
          </div>
        </div>
      </div>
    </section>
  );
}
