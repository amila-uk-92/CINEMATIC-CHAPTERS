import MobileSimulator from "@/components/MobileSimulator";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mobile Simulator · Cinematic Chapters",
  description: "Test and preview the Cinematic Chapters website in mobile screen sizes",
};

export default async function MobilePage(props: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const params = await props.searchParams;
  const isDraft = params?.draft === "1";

  return <MobileSimulator defaultDraft={isDraft} />;
}
