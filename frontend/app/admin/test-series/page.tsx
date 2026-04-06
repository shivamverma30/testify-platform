"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createTestSeries,
  deleteTestSeries,
  getAdminTests,
  getTestSeries,
  updateTestSeries,
  type AdminTest,
  type AdminTestSeries,
} from "@/lib/api";

export default function TestSeriesPage() {
  const [series, setSeries] = useState<AdminTestSeries[]>([]);
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [seriesData, testsData] = await Promise.all([getTestSeries(), getAdminTests()]);
      setSeries(seriesData);
      setTests(testsData);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to load test series.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice(0);
    setVisibility("private");
    setSelectedTestIds([]);
    setEditingId(null);
  };

  const onToggleTest = (testId: string) => {
    setSelectedTestIds((current) =>
      current.includes(testId) ? current.filter((id) => id !== testId) : [...current, testId],
    );
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      if (editingId) {
        await updateTestSeries(editingId, {
          series_name: name,
          description,
          price,
          visibility,
          selected_test_ids: selectedTestIds,
        });
      } else {
        await createTestSeries({
          series_name: name,
          description,
          price,
          visibility,
          selected_test_ids: selectedTestIds,
        });
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to save test series.";
      setError(message);
    }
  };

  const onEdit = (item: AdminTestSeries) => {
    setEditingId(item.id);
    setName(item.series_name);
    setDescription(item.description || "");
    setPrice(item.price);
    setVisibility(item.visibility);
    setSelectedTestIds(item.tests.map((test) => test.id));
  };

  const onDelete = async (seriesId: string) => {
    setError(null);

    try {
      await deleteTestSeries(seriesId);
      setSeries((current) => current.filter((item) => item.id !== seriesId));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to delete series.";
      setError(message);
    }
  };

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Test Series</p>
        <h2 className="font-display mt-1 text-3xl text-white">Create and Manage Series</h2>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="glass-card rounded-2xl p-5">
        <h3 className="font-display text-xl text-white">{editingId ? "Edit Test Series" : "Create Test Series"}</h3>
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            required
            placeholder="series_name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
          />
          <input
            type="number"
            min={0}
            placeholder="price"
            value={price}
            onChange={(event) => setPrice(Number(event.target.value))}
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
          />
          <textarea
            placeholder="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="md:col-span-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
          />
          <select
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as "public" | "private")}
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>

          <div className="md:col-span-2">
            <p className="mb-2 text-sm text-slate-300">Select tests to include in the series</p>
            <div className="grid gap-2 md:grid-cols-2">
              {tests.map((test) => (
                <label key={test.id} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={selectedTestIds.includes(test.id)}
                    onChange={() => onToggleTest(test.id)}
                  />
                  {test.title}
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">
              {editingId ? "Update Series" : "Create Series"}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 hover:bg-white/10">
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <h3 className="font-display text-xl text-white">Existing Test Series</h3>
        {isLoading ? <p className="mt-3 text-sm text-slate-300">Loading series...</p> : null}
        {!isLoading ? (
          <div className="mt-4 space-y-3">
            {series.map((item) => (
              <article key={item.id} className="rounded-xl border border-white/15 bg-white/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-white">{item.series_name}</p>
                  <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs uppercase tracking-[0.08em]">
                    {item.visibility}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{item.description || "No description"}</p>
                <p className="mt-1 text-xs text-slate-300">
                  Price: INR {item.price} · Tests: {item.total_tests}
                </p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => onEdit(item)} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs text-white hover:bg-indigo-400">Edit</button>
                  <button type="button" onClick={() => void onDelete(item.id)} className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs text-white hover:bg-rose-400">Delete</button>
                </div>
              </article>
            ))}
            {!series.length ? <p className="text-sm text-slate-300">No test series created yet.</p> : null}
          </div>
        ) : null}
      </section>
    </section>
  );
}
