import sampleOutput from "../../sample-output.json";
import { SAMPLE_FORMAT, isSampleRamble } from "../../sample";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";
const TRY_AGAIN =
  "The writing service isn't answering right now. Try again in a minute.";
const MAX_RAMBLE_CHARS = 8000;
const MAX_ANSWERS_CHARS = 2000;

type Format = "dev" | "devpost";

const FORMAT_NAMES: Record<Format, string> = {
  dev: "a DEV challenge post",
  devpost: "a Devpost project story",
};

const STRUCTURE: Record<Format, string> = {
  dev: `Structure for a DEV challenge post. Start with a one-line hook as plain text, with no heading. Then use these markdown "##" headings, in this order, and no others:
## What I built
## Demo
## How I built it
## What was hard
## What I learned
## Links`,
  devpost: `Structure for a Devpost story. Use these markdown "##" headings, in this order, and no others, with no hook line before the first heading:
## Inspiration
## What it does
## How I built it
## Challenges I ran into
## Accomplishments that I'm proud of
## What I learned
## What's next`,
};

function systemPrompt(format: Format) {
  return `You turn a developer's spoken notes about a project they built into ${FORMAT_NAMES[format]}. The notes are a rough voice ramble, so expect filler words, repeats and loose structure. Your job is to shape them into a clear draft without changing what they say.

Voice and style:
- Write in the first person, as the developer who built the project.
- Use plain, human-sounding English, the way a developer talks to other developers. Short sentences are fine. Say what happened and what you did.
- Never use any dash character except the plain keyboard hyphen (-). That bans em dashes, en dashes, non-breaking hyphens, figure dashes, minus signs and every other dash-like symbol. Use a comma, a full stop or the word "and" instead. A plain hyphen inside a word, like "real-time" or "one-page", is fine.
- Do not use hype or marketing words, such as revolutionary, seamless, game-changing, cutting-edge, powerful, robust, supercharge, unlock, leverage, or delve. Describe what the thing does instead of praising it.

${STRUCTURE[format]}

Under each heading, write only what the notes say. If the notes say nothing about a section, keep it to one line holding a specific placeholder (see below) and add the matching question to the missing facts list. Do not pad sections with filler. A short draft is fine when the notes are short.

Facts (strict):
- Only use what the developer actually said. If they did not say it, it does not go in the draft. You may reword and reorder what they said, but you may not add to it.
- Every sentence in the draft must trace back to something in the notes. Do not add explanations, background, general statements about technology, or guesses about how the project works.
- Do not describe features, steps, architecture, inputs or outputs that the notes do not mention. Do not fill gaps with what a project like this would usually do.
- Only name a tool, library, framework, model or service if the developer named it. Only state a number, date, link or name if the developer gave it.
- Describing what the project does is the most important part. If the developer says what it does or how a person uses it, say that in the "What I built" or "What it does" section, close to how they said it. Never cut it.
- If the developer says the project's name, use that exact name in the opening hook (DEV format) or in the first section (Devpost format), and again where it reads naturally. Also keep the problem they say they had (for example time lost or something that annoyed them), and put it first in "What I built" for the DEV format or in "Inspiration" for the Devpost format. Keep any rules or choices they say they set for the project.
- Keep every number, count and named event, platform or tool the developer mentions (for example "3 weeks", or the name of a hackathon), and every rule they say they set for the project, in their own words.
- Use everything they said. Every fact the developer mentions (what the project is, what it does, who it is for, tools, numbers, links, problems, results) must appear somewhere in the draft, under the heading where it fits best. Before you answer, check the draft against the notes one fact at a time: nothing the developer said may be left out, and nothing they did not say may be added.
- Never invent facts, links, numbers, names, dates, tools or results.
- The input may also include "Answers to the missing facts questions". Those come from the developer too, so treat them as part of the notes. Use them to fill in the placeholders, and only ask again about things that are still missing.
- If a good post needs something that is not in the notes (for example a live link, a repo link, a number, a team or tool name, or the reason you built it), do two things. First, leave a specific placeholder in square brackets in the draft that names exactly what is missing, like [demo link], [repo link], [live link], [number of users], [why I built it] or [the hardest bug]. Every placeholder must say what the missing thing is, in two to four words, for example [future plans] under "What's next" or [what inspired me] under "Inspiration". Never use a generic placeholder such as [placeholder], [TBD], [info], [details], [more info] or [insert here]. Second, add a short question for it to the missing facts list, like "What is the live link?".
- Do not ask about things the notes already cover, and do not repeat the same question twice.

Output:
Reply with JSON only, in exactly this shape:
{"draft": "<the post as markdown>", "missingFacts": ["<question>", "..."]}
If nothing is missing, "missingFacts" must be an empty list.`;
}

// Backup for the prompt rule: the only dash allowed in the output is a plain hyphen.
function stripDashes(text: string) {
  return (
    text
      // Hyphen-like characters that look like a hyphen: make them a plain one.
      // U+2010 hyphen, U+2011 non-breaking hyphen, U+2212 minus, U+FE63, U+FF0D
      .replace(/[\u2010\u2011\u2212\uFE63\uFF0D]/g, "-")
      // Number ranges like 5-10 written with an en dash.
      .replace(/(\d)\s*[\u2012\u2013]\s*(?=\d)/g, "$1-")
      // Real dashes: U+2012 to U+2015, U+2E3A, U+2E3B, U+FE58.
      // A dash used mid-sentence becomes a comma.
      .replace(/[ \t]*[\u2012-\u2015\u2E3A\u2E3B\uFE58][ \t]*(?=\S)/g, ", ")
      // A dash at the end of a line or the text is dropped.
      .replace(/[ \t]*[\u2012-\u2015\u2E3A\u2E3B\uFE58]+[ \t]*/g, "")
      // Tidy up a comma that landed right after other punctuation or a line start.
      .replace(/([,.;:!?]), /g, "$1 ")
      .replace(/^, /gm, "")
  );
}

// Backup for the prompt rule: a generic placeholder like [TBD] is renamed after
// the section it sits in, for example [future plans] under "What's next".
const GENERIC_PLACEHOLDER =
  /\[\s*(placeholder|tbd|todo|info|details?|more info|more details?|insert here|insert text|n\/a|none|\.\.\.|xxx?)\s*\]/gi;

function namePlaceholders(text: string) {
  let heading = "";
  return text
    .split("\n")
    .map((line) => {
      const match = line.match(/^#{1,6}\s+(.*\S)\s*$/);
      if (match) heading = match[1].toLowerCase();
      return line.replace(GENERIC_PLACEHOLDER, () => `[${heading || "opening hook"}]`);
    })
    .join("\n");
}

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("That request didn't look right. Please try again.", 400);
  }

  const { ramble, format, answers } = (body ?? {}) as {
    ramble?: unknown;
    format?: unknown;
    answers?: unknown;
  };

  if (format !== "dev" && format !== "devpost") {
    return error("Pick a format: DEV challenge post or Devpost story.", 400);
  }

  const text = typeof ramble === "string" ? ramble.trim() : "";
  if (text.length === 0) {
    return error("Say or type something about what you built first.", 400);
  }
  if (text.length > MAX_RAMBLE_CHARS) {
    return error(
      `That's a bit long. Please keep it under ${MAX_RAMBLE_CHARS.toLocaleString("en-US")} characters.`,
      413,
    );
  }

  const extra = typeof answers === "string" ? answers.trim() : "";
  if (extra.length > MAX_ANSWERS_CHARS) {
    return error(
      `Your answers are a bit long. Please keep them under ${MAX_ANSWERS_CHARS.toLocaleString("en-US")} characters.`,
      413,
    );
  }

  const userContent = extra
    ? `Notes:\n${text}\n\nAnswers to the missing facts questions:\n${extra}`
    : text;

  // If the writing service fails, the sample ramble gets its saved example.
  // Any other input gets a plain "try again in a minute" message.
  const useSavedExample =
    format === SAMPLE_FORMAT && extra === "" && isSampleRamble(text);
  function fail(message: string, status: number) {
    if (useSavedExample) {
      return Response.json({
        draft: sampleOutput.draft,
        missingFacts: sampleOutput.missingFacts,
        saved: true,
      });
    }
    return error(message, status);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return fail(
      "The server is missing its GROQ_API_KEY, so it can't write drafts yet.",
      500,
    );
  }

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt(format),
          },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        reasoning_effort: "low",
        temperature: 0.1,
        max_completion_tokens: 3000,
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    return fail(TRY_AGAIN, 502);
  }

  if (res.status === 429) {
    return fail(TRY_AGAIN, 429);
  }
  if (!res.ok) {
    return fail(TRY_AGAIN, 502);
  }

  try {
    const data = await res.json();
    const content: unknown = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(typeof content === "string" ? content : "");

    const draft: unknown = parsed?.draft;
    const missing: unknown = parsed?.missingFacts;
    if (typeof draft !== "string" || draft.trim() === "") {
      throw new Error("bad shape");
    }
    const missingFacts = Array.isArray(missing)
      ? missing.filter((m): m is string => typeof m === "string")
      : [];

    return Response.json({
      draft: namePlaceholders(stripDashes(draft)),
      missingFacts: missingFacts.map(stripDashes),
    });
  } catch {
    return fail(TRY_AGAIN, 502);
  }
}
