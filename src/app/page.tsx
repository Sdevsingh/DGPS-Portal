import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    const role = session.user.role;
    if (role === "client") redirect("/client");
    if (role === "technician") redirect("/technician");
    redirect("/dashboard");
  }
  redirect("/login");
}
