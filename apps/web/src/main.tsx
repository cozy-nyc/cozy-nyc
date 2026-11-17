import { createRoot } from "react-dom/client";
import "@cozy/comfy/css/cozy.css";
import "./styles.css";
import { App } from "./App";
import { logo } from "./logo";

document.querySelector<HTMLLinkElement>("link[rel=icon]")!.href = logo;

createRoot(document.getElementById("root")!).render(<App />);
