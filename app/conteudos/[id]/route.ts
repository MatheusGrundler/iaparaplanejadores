import { NextResponse, type NextRequest } from "next/server";

/** Alias estável por material: BASE-URL/conteudos/ID -> leitor do material. */
export function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const downloadId = Number(id);
    const destino =
      Number.isSafeInteger(downloadId) && downloadId > 0 ? `/material/${downloadId}` : "/";
    return NextResponse.redirect(new URL(destino, req.url));
  });
}
