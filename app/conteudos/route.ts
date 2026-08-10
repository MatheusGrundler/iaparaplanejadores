import { NextResponse, type NextRequest } from "next/server";

/** Alias estável usado nos slides e materiais: BASE-URL/conteudos -> home da área. */
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/", req.url));
}
