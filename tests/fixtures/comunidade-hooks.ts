import { registerHooks } from "node:module";

type Opcoes = {
  servidor?: boolean;
  interface?: boolean;
  rotas?: boolean;
};

export function registrarHooksComunidade(opcoes: Opcoes = {}) {
  const runtime = new URL("./comunidade-runtime.mock.ts", import.meta.url).href;
  const css = new URL("./comunidade-css.mock.ts", import.meta.url).href;
  const tiptapReact = new URL("./comunidade-tiptap-react.mock.tsx", import.meta.url).href;
  const tiptapExtension = new URL("./comunidade-tiptap-extension.mock.ts", import.meta.url).href;
  const reactHooks = new URL("./comunidade-react-hooks.mock.ts", import.meta.url).href;
  const tus = new URL("./comunidade-tus.mock.ts", import.meta.url).href;

  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") {
        return { url: "node:assert", shortCircuit: true };
      }
      if (opcoes.servidor && specifier === "@/lib/auth") {
        return { url: runtime, shortCircuit: true };
      }
      if (opcoes.servidor && specifier === "@/lib/supabase/admin") {
        return { url: runtime, shortCircuit: true };
      }
      if (opcoes.rotas && specifier === "@/lib/comunidade-server") {
        return { url: runtime, shortCircuit: true };
      }
      if (opcoes.rotas && specifier === "@/lib/comunidade-storage") {
        return { url: runtime, shortCircuit: true };
      }
      if (opcoes.rotas && specifier === "next/cache") {
        return { url: runtime, shortCircuit: true };
      }
      if (opcoes.interface && specifier === "next/navigation") {
        return { url: runtime, shortCircuit: true };
      }
      if (
        opcoes.interface &&
        specifier === "react" &&
        (context.parentURL?.endsWith("/comunidade/Composer.tsx") ||
          context.parentURL?.endsWith("/componentes/EditorRico.tsx"))
      ) {
        return { url: reactHooks, shortCircuit: true };
      }
      if (opcoes.interface && specifier === "@tiptap/react") {
        return { url: tiptapReact, shortCircuit: true };
      }
      if (opcoes.interface && specifier === "tus-js-client") {
        return { url: tus, shortCircuit: true };
      }
      if (
        opcoes.interface &&
        (specifier === "@tiptap/starter-kit" || specifier === "@tiptap/extension-link")
      ) {
        return { url: tiptapExtension, shortCircuit: true };
      }
      if (opcoes.interface && specifier.endsWith(".module.css")) {
        return { url: css, shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
  });
}
