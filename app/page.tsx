import RambleForm from "./ramble-form";

const REPO_URL = "https://github.com/StarKnightt/ramblepost";

export default function Home() {
  return (
    <>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:py-16">
        <header className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Ramblepost
          </h1>
          <p className="mt-3 text-lg text-neutral-600">
            Say what you built. Get the hackathon post.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Talk with Wispr Flow or any voice typing. Ramblepost never stores
            what you say.
          </p>
        </header>
        <RambleForm />
      </main>
      <footer className="mx-auto w-full max-w-6xl px-6 pb-10 text-sm text-neutral-500">
        <p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline underline-offset-2 hover:text-accent-dark"
          >
            GitHub repo
          </a>
          <span className="mx-2" aria-hidden="true">
            |
          </span>
          Built by voice with Wispr Flow for the No Hands challenge.
        </p>
      </footer>
    </>
  );
}
