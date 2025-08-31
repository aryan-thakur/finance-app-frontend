import { Suspense } from "react";
import { TransactionsPage } from "../../components/transactions/transactions-page";

export default async function Page({
  searchParams,
}: {
  searchParams?: { lower?: string; upper?: string };
}) {
  const lower = Number((await searchParams?.lower) ?? 1);
  const upper = Number((await searchParams?.upper) ?? 50);
  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 text-balance">Transactions</h1>
      <Suspense
        fallback={
          <div className="text-muted-foreground">Loading Transactions…</div>
        }
      >
        <TransactionsPage lower={lower} upper={upper} />
      </Suspense>
    </main>
  );
}
