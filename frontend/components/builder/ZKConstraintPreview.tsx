import type { StrategyNode, ZKConstraint } from "@/types";

interface ZKConstraintPreviewProps {
  selectedNode: StrategyNode | null;
  constraints: ZKConstraint[];
  estimatedProofSize: number;
}

const humanType = (type: ZKConstraint["constraintType"]) => {
  if (type === "range_check") return "Range check";
  if (type === "sum_partition") return "Partition sum";
  if (type === "state_transition") return "State transition";
  return "Assertion";
};

export function ZKConstraintPreview({
  selectedNode,
  constraints,
  estimatedProofSize,
}: ZKConstraintPreviewProps) {
  const selectedConstraint = selectedNode
    ? constraints.find((item) => item.nodeId === selectedNode.id) ?? null
    : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-heading text-sm font-bold">ZK Constraint Preview</h4>
        <span className="text-xs text-muted">Proof ≈ {estimatedProofSize} bytes</span>
      </div>

      {selectedConstraint ? (
        <div className="space-y-2 text-xs">
          <p className="text-primary">{humanType(selectedConstraint.constraintType)}</p>
          <p className="text-muted">Node: {selectedConstraint.nodeId.slice(0, 8)}</p>
          <p className="text-muted">Public inputs: {selectedConstraint.publicInputs.length}</p>
          <p className="text-muted">Witness fields: {selectedConstraint.privateWitness.length}</p>
          <p className="text-muted">
            PRIVATE fields remain hidden — never log or transmit.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted">
          Select a node to inspect its generated ZK constraint and witness shape.
        </p>
      )}
    </div>
  );
}
