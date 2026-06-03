import { createFileRoute } from "@tanstack/react-router";
import { PageEditor } from "@/components/admin/PageEditor";
import { SERVICES_SCHEMA } from "@/lib/content-registry";

export const Route = createFileRoute("/admin/site/services")({
  component: () => <PageEditor schema={SERVICES_SCHEMA} />,
});
