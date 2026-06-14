import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getMessages } from "@/lib/gmail";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the Google OAuth access token from Clerk
    const clerk = await clerkClient();
    const tokenResponse = await clerk.users.getUserOauthAccessToken(
      userId,
      "google"
    );

    const accessToken = tokenResponse.data?.[0]?.token;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No Google access token found. Please sign out and sign in again." },
        { status: 401 }
      );
    }

    const emails = await getMessages(accessToken, 50);

    return NextResponse.json({ emails, count: emails.length });
  } catch (error) {
    console.error("[/api/emails/fetch]", error);
    return NextResponse.json(
      { error: "Failed to fetch emails. Please try again." },
      { status: 500 }
    );
  }
}
