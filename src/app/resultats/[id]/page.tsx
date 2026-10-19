import ResultReport from "@/components/result-report";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/header";
import ResultActions from "@/components/result-actions";
import { getSubmission } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Votre restitution | Transitions",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await getSubmission(id);
  if (!record) notFound();
  return (
    <>
      <Header />
      <ResultReport record={record} footer={
        <Link className="text-link no-print" href="/">
          Revenir au questionnaire <ArrowUpRight size={15} />
        </Link>
      }>
        <ResultActions id={record.id} />
      </ResultReport>
    </>
  );
}
