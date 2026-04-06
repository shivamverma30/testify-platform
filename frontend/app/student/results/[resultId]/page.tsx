"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  getResultDetail,
  getTestLeaderboard,
  type ResultDetail,
  type TestLeaderboardResponse,
} from "@/lib/api";

type ResultDetailPageProps = {
  params: {
    resultId: string;
  };
};

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export default function ResultDetailPage({ params }: ResultDetailPageProps) {
  const [result, setResult] = useState<ResultDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<TestLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadResult = async () => {
      setLoading(true);
      setError(null);

      try {
        const payload = await getResultDetail(params.resultId);
        const leaderboardPayload = await getTestLeaderboard(payload.test_id);

        if (ignore) {
          return;
        }

        setResult(payload);
        setLeaderboard(leaderboardPayload);
      } catch (err) {
        if (ignore) {
          return;
        }

        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unable to load result right now.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadResult();

    return () => {
      ignore = true;
    };
  }, [params.resultId]);

  if (loading) {
    return (
      <section className="space-y-4 page-enter">
        <h1 className="font-display text-2xl text-white">Loading Result...</h1>
      </section>
    );
  }

  if (error || !result) {
    return (
      <section className="space-y-4 page-enter">
        <div className="rounded-2xl border border-rose-300/40 bg-rose-500/12 p-5 text-rose-100">
          <p className="font-medium">Unable to load result</p>
          <p className="mt-1 text-sm">{error || "Result not found."}</p>
        </div>
        <Link
          href="/student/results"
          className="inline-flex rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
        >
          Go to Results List
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6 page-enter">
      <header>
        <p className="text-sm font-medium text-cyan-200">Student Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-white">Detailed Result</h1>
        <p className="mt-2 text-sm text-slate-300">{result.test_name}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Total Score</p>
          <p className="font-display mt-1 text-2xl text-white">{result.total_score}</p>
        </article>
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Correct Answers</p>
          <p className="font-display mt-1 text-2xl text-white">{result.correct_answers}</p>
        </article>
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Wrong Answers</p>
          <p className="font-display mt-1 text-2xl text-white">{result.wrong_answers}</p>
        </article>
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Unattempted</p>
          <p className="font-display mt-1 text-2xl text-white">{result.unattempted_questions}</p>
        </article>
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Accuracy</p>
          <p className="font-display mt-1 text-2xl text-white">{result.accuracy_percentage.toFixed(2)}%</p>
        </article>
        <article className="glass-card rounded-2xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Generated At</p>
          <p className="mt-1 text-sm text-white">{formatDate(result.generated_at)}</p>
        </article>
      </div>

      <section className="glass-card rounded-2xl p-5">
        <h2 className="font-display text-xl text-white">Question-wise Analysis</h2>
        <div className="mt-4 max-h-[420px] overflow-y-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[960px] text-left text-sm text-slate-200">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-300">
              <tr>
                <th className="px-3 py-2">Q#</th>
                <th className="px-3 py-2">Subject / Topic</th>
                <th className="px-3 py-2">Question</th>
                <th className="px-3 py-2">Your Answer</th>
                <th className="px-3 py-2">Correct</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.question_wise_analysis.map((item) => (
                <tr key={item.question_id} className="border-t border-white/10">
                  <td className="px-3 py-2">{item.question_number}</td>
                  <td className="px-3 py-2">
                    {item.subject}
                    <p className="text-xs text-slate-400">{item.topic}</p>
                  </td>
                  <td className="px-3 py-2">{item.question_text}</td>
                  <td className="px-3 py-2">{item.student_answer ?? "-"}</td>
                  <td className="px-3 py-2">{item.correct_answer}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === "unattempted"
                          ? "bg-slate-500/20 text-slate-200"
                          : item.is_correct
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-rose-500/20 text-rose-200"
                      }`}
                    >
                      {item.status === "unattempted" ? "Unattempted" : item.is_correct ? "Correct" : "Incorrect"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <h2 className="font-display text-xl text-white">Leaderboard Snapshot</h2>
        <p className="mt-2 text-sm text-slate-300">
          Total participants: {leaderboard?.total_participants ?? 0} · Your rank: {leaderboard?.my_rank ?? result.rank ?? "-"}
        </p>
        <div className="mt-4 space-y-2">
          {(leaderboard?.leaderboard || []).slice(0, 10).map((entry) => (
            <article
              key={entry.result_id}
              className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
            >
              <p className="text-slate-100">
                #{entry.rank} {entry.student_name}
              </p>
              <p className="text-slate-300">
                Score {entry.total_score} · Accuracy {entry.accuracy_percentage.toFixed(2)}%
              </p>
            </article>
          ))}
          {!leaderboard?.leaderboard?.length ? (
            <p className="text-sm text-slate-300">Leaderboard will appear once results are available.</p>
          ) : null}
        </div>
      </section>

      <Link
        href="/student/results"
        className="inline-flex rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
      >
        Back to Results List
      </Link>
    </section>
  );
}
