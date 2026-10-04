import { getContent } from "@/lib/content";
import Portfolio from "@/components/Portfolio";
export const dynamic = "force-dynamic";
export default async function Home() {
  return <Portfolio content={await getContent()} />;
}
