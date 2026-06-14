import { MongoClient } from "mongodb";

// MONGODB_URI will be added to .env.local when you set up Atlas in Phase 3
const uri = process.env.MONGODB_URI as string;

if (!uri) {
  // Don't throw at module load time — only fail if actually used
  console.warn("[mongodb] MONGODB_URI is not set. DB features are disabled.");
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // Prevents multiple connections in dev (Next.js hot reload)
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise && uri) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise!;
} else {
  if (uri) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
}

export default clientPromise!;
