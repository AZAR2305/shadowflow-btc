import { Navigation } from "@/components/navigation";

export default function ChallengePage() {
  return (
    <main className="min-h-screen bg-[#f7f7f2]">
      <Navigation />

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-3xl border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="inline-flex rounded-full border-2 border-black bg-[#FFE08A] px-4 py-1 text-xs font-bold uppercase tracking-wide">
              Starknet Privacy Bounty
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              Bitcoin Privacy Innovation with Starknet and Zero-Knowledge Infrastructure
            </h1>
            <p className="mt-4 text-base leading-7 text-[#333]">
              This track focuses on tools, protocols, and apps that improve financial privacy for Bitcoin users.
              Projects are expected to leverage Starknet and ZK systems to build practical privacy-preserving flows.
            </p>
            <p className="mt-3 text-base leading-7 text-[#333]">
              Total prize pool is $5,000 USD. Awards may be split among up to five finalist teams depending on
              submission quality and diversity.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border-4 border-black bg-[#E6F2FF] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-bold">Submission Requirements</h2>
              <ul className="mt-3 list-disc pl-5 text-sm leading-7 text-[#222]">
                <li>Open-source repository with functional code (GitHub link required)</li>
                <li>Clear documentation of architecture, key features, and privacy guarantees</li>
                <li>Demo video (3-5 minutes) showing the project in action</li>
                <li>README with dependencies, run instructions, and team members</li>
                <li>Submission completed on official platform before PL Genesis deadline</li>
              </ul>
            </div>

            <div className="rounded-3xl border-4 border-black bg-[#FFF3D9] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-bold">Judging Criteria</h2>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-[#222]">
                <li>Privacy Innovation (30%)</li>
                <li>Technical Execution (25%)</li>
                <li>Integration with Starknet or ZK tech (20%)</li>
                <li>Usability and Design (15%)</li>
                <li>Potential Impact (10%)</li>
              </ul>
            </div>

            <div className="rounded-3xl border-4 border-black bg-[#E9FFE9] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:col-span-2">
              <h2 className="text-2xl font-bold">What This App Demonstrates</h2>
              <p className="mt-3 text-sm leading-7 text-[#2f2f2f]">
                ShadowFlow Starknet Edition maps this challenge into production-like flows: BTC wallet intent capture,
                privacy-oriented trade matching, verifiable proof lifecycle visibility, and auditable settlement status.
              </p>
              <p className="mt-3 text-sm leading-7 text-[#2f2f2f]">
                Continue with OTC Intent and Transactions pages to test the end-to-end operator and user experience.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
