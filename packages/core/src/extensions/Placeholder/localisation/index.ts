import i18next from "i18next";
import { translation } from "./translation";

i18next.init({
  lng: navigator.language || "en",
  debug: import.meta.env.DEV,
  resources: translation,
});

export default i18next;
