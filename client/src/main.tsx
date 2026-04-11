import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { svSE } from "@clerk/localizations";
import App from "./App";
import "./index.css";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
console.log("VITE_CLERK_PUBLISHABLE_KEY", clerkPublishableKey);

if (!clerkPublishableKey) {
  throw new Error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY environment variable. Please set it in your .env file."
  );
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider
    publishableKey={clerkPublishableKey}
    localization={svSE}
    appearance={{
      layout: {
        socialButtonsPlacement: "bottom",
      },
      variables: {
        colorPrimary: "#111827",
      },
    }}
  >
    <App />
  </ClerkProvider>
);
