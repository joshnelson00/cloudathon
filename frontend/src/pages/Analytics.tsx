import { useMemo, useState } from "react"
import Layout from "../components/Layout"
import { api } from "../api/client"

type AnalyticsResult = {
  answer: string
  data: Record<string, unknown>
  mode: string
  intent: string
  generated_sql?: string | null
}

const EXAMPLES = [
  "How many devices were processed today?",
  "Show me failed wipes this week",
  "How many laptops vs desktops?",
  "Which devices are still in progress?",
  "What is our completion rate?",
  "What is the wipe pass rate?",
  "Show status breakdown",
  "Show device type breakdown",
  "Any documented devices missing certificate links?",
  "How many external drives do we have?",
]

export default function Analytics() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<AnalyticsResult | null>(null)

  const canRun = useMemo(() => query.trim().length > 0 && !loading, [query, loading])

  const runQuery = async (q?: string) => {
    const finalQuery = (q ?? query).trim()
    if (!finalQuery) return

    setLoading(true)
    setError("")
    try {
      const res = await api.post("/api/analytics/query", { query: finalQuery })
      setResult(res.data)
      setQuery(finalQuery)
    } catch {
      setError("Could not run analytics query. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        <section>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">AI Insights</h1>
          <p className="text-slate-400 mt-1">Ask questions about devices and compliance in plain language.</p>
        </section>

        <section className="bg-slate-900 rounded-lg border border-slate-800 p-6 space-y-4">
          <label htmlFor="analytics-query" className="block text-sm font-bold text-slate-300">Natural Language Query</label>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              id="analytics-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canRun) {
                  void runQuery()
                }
              }}
              className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="How many laptops failed wipe this week?"
            />
            <button
              onClick={() => void runQuery()}
              disabled={!canRun}
              className="px-6 py-3 rounded-lg font-bold bg-orange-600 text-white hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-400"
            >
              {loading ? "Running..." : "Run Query"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => void runQuery(example)}
                className="text-xs px-3 py-2 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <section className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
            {error}
          </section>
        )}

        {result && (
          <section className="bg-slate-900 rounded-lg border border-slate-800 p-6 space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <h2 className="text-xl font-bold text-white">Result</h2>
              <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Mode: {result.mode}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Intent: {result.intent}
              </span>
            </div>

            <p className="text-emerald-300 font-semibold">{result.answer}</p>

            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <div className="bg-slate-800/60 px-4 py-2 text-xs font-bold text-slate-300 uppercase">Data</div>
              <pre className="p-4 text-sm text-slate-200 overflow-x-auto">{JSON.stringify(result.data, null, 2)}</pre>
            </div>

            {result.generated_sql && (
              <div className="rounded-lg border border-slate-800 overflow-hidden">
                <div className="bg-slate-800/60 px-4 py-2 text-xs font-bold text-slate-300 uppercase">Generated SQL</div>
                <pre className="p-4 text-sm text-slate-200 overflow-x-auto">{result.generated_sql}</pre>
              </div>
            )}
          </section>
        )}
      </div>
    </Layout>
  )
}
