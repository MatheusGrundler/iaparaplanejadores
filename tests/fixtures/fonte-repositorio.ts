import { readFile } from "node:fs/promises";

const raizRepositorio = new URL("../../", import.meta.url);

export function fonteRepositorio(caminho: string) {
  return readFile(new URL(caminho, raizRepositorio), "utf8");
}
