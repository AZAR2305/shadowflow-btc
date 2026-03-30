import { Navigation } from "@/components/navigation";
import { TransactionsPage } from "@/components/transactions-page";

export default function TransactionsRoutePage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <TransactionsPage />
    </main>
  );
}
