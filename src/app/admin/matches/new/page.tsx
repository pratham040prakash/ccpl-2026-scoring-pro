import { redirect } from "next/navigation";

/** Legacy URL from admin panel — route to match control. */
export default function AdminNewMatchRedirect() {
  redirect("/admin/matches");
}
