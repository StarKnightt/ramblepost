"use client";

import { useEffect, useRef, useState } from "react";
import sampleOutput from "./sample-output.json";
import { SAMPLE_FORMAT, SAMPLE_RAMBLE, isSampleRamble } from "./sample";

type Format = "dev" | "devpost";

type Result = {
  draft: string;
  missingFacts: string[];
  ramble: string;
  format: Format;
  saved: boolean;
};

const TRY_AGAIN =
  "The writing service isn't answering right now. Try again in a minute.";

const FORMATS: { value: Format; label: string }[] = [
  { value: "dev", label: "DEV challenge post" },
  { value: "devpost", label: "Devpost story" },
];

const buttonClass =
  "rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

const secondaryButtonClass =
  "rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

export default function RambleForm() {
  const [ramble, setRamble] = useState("");
  const [format, setFormat] = useState<Format>("dev");
  const [answers, setAnswers] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  async function requestDraft(input: {
    ramble: string;
    format: Format;
    answers?: string;
  }) {
    setLoading(true);
    setError(null);

    // If the request fails (network, timeout, server error), the sample ramble
    // still gets its saved example. Any other input gets a "try again" message.
    function failed(message: string) {
      if (
        input.format === SAMPLE_FORMAT &&
        !input.answers?.trim() &&
        isSampleRamble(input.ramble)
      ) {
        setResult({
          draft: sampleOutput.draft,
          missingFacts: sampleOutput.missingFacts,
          ramble: input.ramble,
          format: input.format,
          saved: true,
        });
      } else {
        setError(message);
      }
    }

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data.draft !== "string") {
        failed(data?.error ?? TRY_AGAIN);
        return;
      }
      setResult({
        draft: data.draft,
        missingFacts: Array.isArray(data.missingFacts) ? data.missingFacts : [],
        ramble: input.ramble,
        format: input.format,
        saved: data.saved === true,
      });
    } catch {
      failed(TRY_AGAIN);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAnswers("");
    setCopied(false);
    void requestDraft({ ramble, format });
  }

  function handleRegenerate() {
    if (!result) return;
    setCopied(false);
    void requestDraft({
      ramble: result.ramble,
      format: result.format,
      answers,
    });
  }

  function handleSample() {
    setRamble(SAMPLE_RAMBLE);
    setFormat(SAMPLE_FORMAT);
    setError(null);
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.draft);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the text and copy it by hand.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label htmlFor="ramble" className="sr-only">
          Your ramble
        </label>
        <textarea
          id="ramble"
          value={ramble}
          onChange={(e) => setRamble(e.target.value)}
          placeholder="Hold your Wispr key and talk about what you built."
          className="min-h-72 w-full resize-y rounded-lg border border-neutral-300 bg-white p-4 text-base leading-7 text-neutral-900 placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 lg:min-h-[28rem]"
        />

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-neutral-700">
            Format
          </legend>
          <div className="flex flex-wrap gap-3">
            {FORMATS.map((f) => (
              <label
                key={f.value}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40 ${
                  format === f.value
                    ? "border-accent bg-accent/5 font-medium text-accent"
                    : "border-neutral-300 text-neutral-700 hover:border-neutral-400"
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={f.value}
                  checked={format === f.value}
                  onChange={() => setFormat(f.value)}
                  className="sr-only"
                />
                {f.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading || ramble.trim().length === 0}
            className={buttonClass}
          >
            {loading && !result ? "Writing..." : "Generate"}
          </button>
          <button
            type="button"
            onClick={handleSample}
            disabled={loading}
            className={secondaryButtonClass}
          >
            Try the sample
          </button>
        </div>
      </form>

      <section
        aria-live="polite"
        className="flex min-h-48 flex-col gap-6 rounded-lg border border-neutral-200 bg-neutral-50 p-5 lg:min-h-[28rem]"
      >
        <h2 className="text-sm font-medium text-neutral-700">Your draft</h2>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        {!result && !error && (
          <p className="-mt-4 text-sm leading-6 text-neutral-500">
            {loading
              ? "Writing your draft..."
              : "Your draft will show up here."}
          </p>
        )}

        {result && (
          <>
            {result.saved && (
              <p className="-mt-3 text-xs text-neutral-500">
                Saved example. The writing service is not answering right now,
                so this is a saved draft for the sample.
              </p>
            )}

            <div className={loading ? "opacity-50" : undefined}>
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-neutral-900">
                {result.draft}
              </pre>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopy}
                disabled={loading}
                className={secondaryButtonClass}
              >
                Copy markdown
              </button>
              <span
                role="status"
                className="text-sm text-accent"
                aria-live="polite"
              >
                {copied ? "Copied" : ""}
              </span>
            </div>

            <div className="border-t border-neutral-200 pt-5">
              <h3 className="text-sm font-medium text-neutral-700">
                Missing facts
              </h3>
              {result.missingFacts.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {result.missingFacts.map((fact, i) => (
                    <li key={`${i}-${fact}`}>
                      <label className="flex items-start gap-2 text-sm leading-6 text-neutral-800">
                        <input
                          type="checkbox"
                          className="mt-1.5 size-4 shrink-0 accent-accent"
                        />
                        <span>{fact}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-neutral-500">
                  Nothing missing. You can still add more details below.
                </p>
              )}

              <label
                htmlFor="answers"
                className="mt-5 block text-sm font-medium text-neutral-700"
              >
                Your answers
              </label>
              <textarea
                id="answers"
                value={answers}
                onChange={(e) => setAnswers(e.target.value)}
                placeholder="Hold your Wispr key and answer the questions above."
                className="mt-2 min-h-28 w-full resize-y rounded-lg border border-neutral-300 bg-white p-3 text-sm leading-6 text-neutral-900 placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={loading || answers.trim().length === 0}
                  className={buttonClass}
                >
                  {loading ? "Writing..." : "Regenerate"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
