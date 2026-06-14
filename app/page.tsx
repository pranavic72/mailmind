import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";

export default async function LandingPage() {
  const { userId } = await auth();

  // Auto-redirect signed-in users to /inbox
  if (userId) {
    redirect("/inbox");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold mb-4">
        Your inbox, intelligently triaged
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md">
        MailMind reads your Gmail, flags what matters, and drafts replies —
        so you just review and approve.
      </p>

      <SignInButton mode="modal">
        <button className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition">
          Sign in with Google
        </button>
      </SignInButton>

      <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl">
        <Feature
          title="Smart Triage"
          desc="Every email sorted into High, Low, or Noise — automatically."
        />
        <Feature
          title="AI Summaries"
          desc="Long threads condensed into 2-3 sentences."
        />
        <Feature
          title="One-Click Replies"
          desc="Context-aware reply drafts you can send instantly."
        />
      </section>
    </main>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="text-left">
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  );
}