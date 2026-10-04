import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getContent } from "@/lib/content";
import Portfolio from "@/components/Portfolio";
export const dynamic = "force-dynamic";
export default async function Preview() {
  try {
    await requireAdmin(await headers());
  } catch {
    redirect("/admin");
  }
  return (
    <>
      <div className="preview-banner">
        DRAFT PREVIEW · This content is not public{" "}
        <a href="/admin">Back to editor</a>
      </div>
      <Portfolio content={await getContent("draft")} preview />
    </>
  );
}
