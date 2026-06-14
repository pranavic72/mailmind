import { google } from "googleapis";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Retrieves the Google OAuth access token for the currently signed-in user
 * (stored by Clerk after the Google OAuth flow) and returns an authenticated
 * Gmail API client.
 *
 * Throws if there is no signed-in user or no Google OAuth token on file.
 */
export async function getGmailClient() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Not authenticated");
  }

  const client = await clerkClient();

  console.log("Attempting to get OAuth token for userId:", userId);

  const tokenResponse = await client.users.getUserOauthAccessToken(
    userId,
    "google"
  );

  console.log("Token response:", tokenResponse);
  console.log("Token response data:", tokenResponse.data);

  const accessToken = tokenResponse.data?.[0]?.token;

  console.log("Access token extracted:", accessToken ? "YES" : "NO");

  if (!accessToken) {
    throw new Error(
      "No Google OAuth access token found for this user. " +
        "Token response was: " + JSON.stringify(tokenResponse.data)
    );
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

/**
 * Fetches the authenticated user's Gmail profile (email address, message
 * counts, etc). Used as a smoke test that the Gmail scope is working.
 */
export async function getGmailProfile() {
  const gmail = await getGmailClient();
  const res = await gmail.users.getProfile({ userId: "me" });
  return res.data;
}