import { Navigation } from "@/components/navigation";

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="surface-strong p-8">
            <h1 className="text-4xl font-bold leading-tight">About ShadowFlow Starknet Edition</h1>
            <p className="mt-4 text-base leading-7 text-[#333]">
              ShadowFlow Starknet Edition is a human-aware, privacy-preserving Bitcoin OTC workflow. It combines BTC wallet
              entry, confidential order intent, proof-aware matching, and settlement observability with Starknet-compatible
              cryptographic flows.
            </p>
            <p className="mt-3 text-base leading-7 text-[#333]">
              The design goal is institutional OTC clarity with user-level privacy: less bot noise, less leakage,
              and stronger verification around settlement logic.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="surface-card bg-[#FFF3D9] p-6">
              <h2 className="text-2xl font-bold">How It Works</h2>
              <ol className="mt-3 list-decimal pl-5 text-sm leading-7 text-[#222]">
                <li>Connect BTC wallet and submit intent privately.</li>
                <li>Generate and attach proof artifacts for verifiable state.</li>
                <li>Match counterparties through backend intent engine.</li>
                <li>Track settlement and execution state in real time.</li>
              </ol>
            </div>

            <div className="surface-card bg-[#E6F2FF] p-6">
              <h2 className="text-2xl font-bold">Starknet + ZK Stack</h2>
              <ul className="mt-3 space-y-2 text-sm text-[#222]">
                <li>Starknet settlement-compatible architecture</li>
                <li>ZK proof ingestion and verification visibility</li>
                <li>Merkle root and nullifier state tracking</li>
                <li>TEE attestation checkpoints for execution trust</li>
              </ul>
            </div>

            <div className="surface-card bg-[#E9FFE9] p-6">
              <h2 className="text-2xl font-bold">Why It Matters</h2>
              <ul className="mt-3 list-disc pl-5 text-sm leading-7 text-[#222]">
                <li>Privacy innovation for Bitcoin OTC participants</li>
                <li>Reduced information leakage before settlement</li>
                <li>Clear, auditable, and scalable execution surfaces</li>
                <li>Built for hackathon-to-production extensibility</li>
              </ul>
            </div>

            <div className="surface-card bg-[#FFE6EB] p-6">
              <h2 className="text-2xl font-bold">Primary Endpoints</h2>
              <ul className="mt-3 space-y-2 text-sm text-[#222]">
                <li>/api/otc/intents</li>
                <li>/api/otc/matches</li>
                <li>/api/otc/trades</li>
                <li>/api/otc/execution-logs</li>
                <li>/api/otc/proofs/latest</li>
                <li>/api/tee/attestations/latest</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
