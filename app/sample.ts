// The sample ramble behind the "Try the sample" button.
// If you change this text, regenerate app/sample-output.json to match it.
export const SAMPLE_RAMBLE = `I enter a lot of hackathons. This month alone I did like 10 of them: DEV challenges, Devpost, Graph Hacks. Every single time, after building the thing, I lose hours turning my scattered notes into a proper post. It's the most boring part so I built Ramblepost.

You just talk about what you built and it gives you a clean DEV post or Devpost story draft in plain language. It also tells you which facts you forgot, like the demo link or the repo link. The fun part is that I built the whole thing by voice. I use Wispr Flow and just talk to Cursor's agent. No typing: it's Next.js with Tailwind and Groq writes the drafts.

What broke: the first drafts messed up. They said my app records audio and removes filler words, which I never said. It also used weird dashes so I told the agent to make the rules way stricter. If I did not say it, it doesn't go in.

Small funny thing: I spent ages figuring out where the env file goes and I almost went gaming with Caps Lock still set as my Wispr key. What I learned is that talking is way faster than typing for the boring parts and you have to be really strict with AI so it doesn't invent stuff.`;

export const SAMPLE_FORMAT = "dev" as const;

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function isSampleRamble(text: string) {
  return normalize(text) === normalize(SAMPLE_RAMBLE);
}
