import { createFileRoute } from "@tanstack/react-router";
import { PageEditor } from "@/components/admin/PageEditor";
import { HOME_SCHEMA } from "@/lib/content-registry";

export const Route = createFileRoute("/admin/site/home")({
  component: () => <PageEditor schema={HOME_SCHEMA} />,
});
