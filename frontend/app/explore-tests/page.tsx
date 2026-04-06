"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentAuthRole, getExploreTestSeries, purchaseTestSeries, type ExploreTestSeriesItem } from "@/lib/api";

export default function ExploreTestsPage() {
  const [series, setSeries] = useState<ExploreTestSeriesItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getExploreTestSeries();
        if (active) {
          setSeries(data);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load test series.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const handlePurchase = async (seriesId: string) => {
    setPurchaseMessage(null);

    if (getCurrentAuthRole() !== "student") {
      setPurchaseMessage("Please login as student to purchase a test series.");
      return;
    }

    try {
      await purchaseTestSeries({
        test_series_id: seriesId,
        payment_id: `demo_${Date.now()}`,
      });
      setPurchaseMessage("Purchase recorded successfully.");
    } catch (purchaseError) {
      setPurchaseMessage(
        purchaseError instanceof Error
          ? purchaseError.message
          : "Unable to complete purchase.",
      );
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-white">Explore Public Test Series</h1>
          <p className="mt-2 max-w-3xl text-slate-300">
            Only test series marked public by coaching institutes are shown in this marketplace.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
        >
          Back to Home
        </Link>
      </header>

      {purchaseMessage ? (
        <p className="mb-4 rounded-xl border border-white/20 bg-white/8 px-4 py-2 text-sm text-slate-100">
          {purchaseMessage}
        </p>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-xl border border-rose-300/40 bg-rose-500/12 px-4 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-slate-300">Loading public test series...</p> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {series.map((item) => (
          <article key={item.id} className="glass-card hover-lift rounded-2xl p-5">
            <p className="font-display text-xl text-white">{item.series_name}</p>
            <p className="mt-1 text-sm text-cyan-100">{item.coaching_name}</p>
            <div className="mt-4 space-y-2 text-sm text-slate-200">
              <p>Total Tests: {item.number_of_tests}</p>
              <p>Price: INR {item.price}</p>
            </div>
            <button
              type="button"
              onClick={() => void handlePurchase(item.id)}
              className="mt-4 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Purchase Test Series
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
