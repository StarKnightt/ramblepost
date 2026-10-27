import RambleForm from "./ramble-form";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Ramblepost
        </h1>
        <p className="mt-3 text-lg text-neutral-600">
          Say what you built. Get the hackathon post.
        </p>
      </header>
      <RambleForm />
    </main>
  );
}
