import PageHeader from "@/components/PageHeader";
import { LibraryManager } from "@/components/admin/LibraryManager";

const LibraryPage = () => (
  <div className="flex flex-col min-h-screen">
    <PageHeader
      title="Library"
      description="Upload, replace, or delete PPTX templates in the Library folder structure."
    />
    <div className="flex-1">
      <LibraryManager />
    </div>
  </div>
);

export default LibraryPage;
