import { getResourceById } from "@/lib/actions/resources";
import { ResourceDetailClient } from "@/components/resources/ResourceDetailClient";
import { notFound } from "next/navigation";


export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resource = await getResourceById(id);

  if (!resource) {
    notFound();
  }

  return <ResourceDetailClient resource={resource} />;
}
