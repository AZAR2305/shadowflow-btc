"use client";

import { ExternalLink, Copy } from "lucide-react";

export function WalletDropdown({
  address,
  btcBalance,
  strkBalance,
  onDisconnect,
}: {
  address: string;
  btcBalance: string;
  strkBalance: string;
  onDisconnect: () => void;
}) {
  return (
    <div className="absolute bottom-16 left-0 z-40 w-[260px] rounded-xl border border-border bg-elevated p-4 shadow-card">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 font-code text-xs text-primary">
          {address.slice(2, 4).toUpperCase()}
        </div>
        <div>
          <p className="font-code text-xs text-code">{address.slice(0, 8)}...{address.slice(-6)}</p>
          <p className="text-[11px] text-secondary">Starknet Testnet</p>
        </div>
      </div>

      <div className="mb-3 space-y-1 rounded-lg border border-border bg-base p-2 text-xs">
        <p className="flex justify-between"><span className="text-secondary">BTC</span><span className="text-btc">{btcBalance} BTC</span></p>
        <p className="flex justify-between"><span className="text-secondary">STRK</span><span className="text-foreground">{strkBalance} STRK</span></p>
      </div>

      <div className="space-y-2 text-xs">
        <button className="flex w-full items-center gap-2 rounded border border-border bg-base px-2 py-1.5 text-secondary hover:text-foreground">
          <ExternalLink className="h-3.5 w-3.5" /> View on Starknet Explorer
        </button>
        <button className="flex w-full items-center gap-2 rounded border border-[#EF444440] bg-[#EF444414] px-2 py-1.5 text-private" onClick={onDisconnect}>
          <Copy className="h-3.5 w-3.5" /> Disconnect
        </button>
      </div>
    </div>
  );
}
