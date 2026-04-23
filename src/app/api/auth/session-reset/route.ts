import { NextResponse } from "next/server";

const AUTH_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.state",
  "__Secure-next-auth.state",
  "next-auth.pkce.code_verifier",
  "__Secure-next-auth.pkce.code_verifier",
];

export async function POST() {
  const res = NextResponse.json({ ok: true });

  for (const name of AUTH_COOKIE_NAMES) {
    // Expire cookie tokens across common NextAuth cookie names.
    res.cookies.set({
      name,
      value: "",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  }

  return res;
}
