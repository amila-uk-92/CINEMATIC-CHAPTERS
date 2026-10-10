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
        <span>DRAFT PREVIEW · This content is not public</span>
        <span style={{ margin: "0 10px", opacity: 0.5 }}>|</span>
        <a href="/mobile?draft=1">📱 Test Mobile View</a>
        <span style={{ margin: "0 10px", opacity: 0.5 }}>|</span>
        <a href="/admin">Back to editor</a>
      </div>
      <Portfolio content={await getContent("draft")} preview />
    </>
  );
}
