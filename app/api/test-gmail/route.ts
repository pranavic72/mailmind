import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 1: get the token from Clerk
  const client = await clerkClient();
  const tokenResponse = await client.users.getUserOauthAccessToken(
    userId,
    "google"
  );

  const accessToken = tokenResponse.data[0]?.token;

  if (!accessToken) {
    return NextResponse.json(
      { error: "No Google token — sign out and sign back in after adding Gmail scope in Clerk Dashboard" },
      { status: 401 }
    );
  }

  // Step 2: use the token to call Gmail
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: "me" });

  return NextResponse.json({ ok: true, profile: profile.data });
}