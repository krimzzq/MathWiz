import {
  i as loadReact,
  t as loadReactDomClient,
} from "./framework-D_rUT4EX.js";
import App from "./app.js";

loadReactDomClient()
  .createRoot(document.getElementById("root"))
  .render(loadReact().createElement(App));
