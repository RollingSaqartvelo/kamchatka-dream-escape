import { createFileRoute } from "@tanstack/react-router";
import { PageEditor } from "@/components/admin/PageEditor";
import { ABOUT_SCHEMA } from "@/lib/content-registry";

export const Route = createFileRoute("/admin/site/about")({
  component: () => <PageEditor schema={ABOUT_SCHEMA} />,
});
