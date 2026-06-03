import { createFileRoute } from "@tanstack/react-router";
import { PageEditor } from "@/components/admin/PageEditor";
import { NAV_SCHEMA } from "@/lib/content-registry";

export const Route = createFileRoute("/admin/site/nav")({
  component: () => <PageEditor schema={NAV_SCHEMA} />,
});
