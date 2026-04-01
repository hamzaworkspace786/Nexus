// app/page.tsx
import LandingPage from "./components/LandingPage"; // Make sure this path matches your file
import { auth } from "@/lib/auth"; // Adjust this path to your Better Auth server instance
import { headers } from "next/headers";

export default async function Home() {
  // Fetch the session securely on the server
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Pass the session down as a prop
  return <LandingPage session={session} />;
}