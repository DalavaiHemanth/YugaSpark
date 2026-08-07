import { hydrateRoot, createRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start";
import { getRouter } from "./router";

const router = getRouter();

const rootElement = document.getElementById("root")!;
if (rootElement && rootElement.innerHTML) {
  hydrateRoot(rootElement, <StartClient router={router} />);
} else if (rootElement) {
  createRoot(rootElement).render(<StartClient router={router} />);
}
