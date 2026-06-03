import { createFileRoute } from "@tanstack/react-router";
import { PageEditor } from "@/components/admin/PageEditor";
import { CONTACTS_SCHEMA } from "@/lib/content-registry";

export const Route = createFileRoute("/admin/site/contacts")({
  component: () => <PageEditor schema={CONTACTS_SCHEMA} />,
});
