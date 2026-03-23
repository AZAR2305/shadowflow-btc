import { ExecutionVisualizer } from "@/components/visualizer/ExecutionVisualizer";

export default function SimulatePage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="font-heading text-3xl font-bold">Execution Visualizer</h1>
      <ExecutionVisualizer />
    </main>
  );
}
