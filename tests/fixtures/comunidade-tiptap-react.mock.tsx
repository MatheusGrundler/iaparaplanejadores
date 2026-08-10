import React from "react";
import { runtimeComunidade } from "./comunidade-runtime.mock";

export function useEditor(options: unknown) {
  const runtime = runtimeComunidade();
  runtime.editorOptions = options;
  return runtime.editor ?? null;
}

export function EditorContent() {
  return <div data-editor-content="true" />;
}
