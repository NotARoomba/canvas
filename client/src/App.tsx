import { Route, Switch } from "wouter";
import Home from "@/views/home";

export function App() {
  return (
    <div className="bg-gradient-to-bl from-cyan-50 to-blue-200">
      <Switch>
        <Route path="/">
          <Home />
        </Route>

        <Route path="/:id">{({ id }) => <App />}</Route>

        <Route>
          <p>404</p>
        </Route>
      </Switch>
    </div>
  );
}
