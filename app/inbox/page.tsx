import { UserButton } from "@clerk/nextjs";

export default function InboxPage() {
  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <UserButton afterSignOutUrl="/" />
      </div>
      <p className="text-gray-600">
        You&apos;re signed in. Inbox UI and email fetching arrive in Phase 2.
      </p>
      <p className="text-sm text-gray-400 mt-4">
        Test Gmail access at{" "}
        <code className="bg-gray-100 px-1 rounded">/api/test-gmail</code>
      </p>
    </main>
  );
}
