import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import "katex/dist/katex.min.css";
import { Route, Switch } from "wouter";
import Home from "@/views/home";
import { Canvas } from "@/views/canvas";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="bg-gradient-to-bl from-cyan-50 to-blue-200">
      <Switch>
        <Route path="/">
          <Home />
        </Route>

        <Route path="/:id">{({ id }) => <Canvas id={id} />}</Route>

        <Route>
          <p>404</p>
        </Route>
      </Switch>
    </div>
  </StrictMode>
);
