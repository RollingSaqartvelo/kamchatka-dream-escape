import { createFileRoute } from "@tanstack/react-router";
import { PageEditor } from "@/components/admin/PageEditor";
import { WELLNESS_SCHEMA } from "@/lib/content-registry";

export const Route = createFileRoute("/admin/site/wellness")({
  component: () => <PageEditor schema={WELLNESS_SCHEMA} />,
});
