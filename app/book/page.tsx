import { getContent } from "@/lib/content";
import Booking from "@/components/Booking";
export const dynamic = "force-dynamic";
export default async function Book() {
  return <Booking content={await getContent()} />;
}
