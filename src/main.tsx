import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <>
      <h1 className="text-5xl font-extrabold  underline">Hello world!</h1>
      <h1 className="text-5xl font-extrabold  underline font-helvetica">
        Hello world!
      </h1>
      <h1 className="text-3xl text-roboto mt-3 font-bold underline">
        Hello world! this is a test of the roboto font
      </h1>
    </>
  </StrictMode>
);
