import PageHeader from "@/components/PageHeader";
import { DynamicGenerator } from "@/components/generator/DynamicGenerator";

const GeneratePage = () => {
  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        title="Generate Presentation"
        description="Create a new presentation by selecting the type and filling in the project details."
      />

      <div className="flex-1 overflow-auto p-8">
        <DynamicGenerator />
      </div>
    </div>
  );
};

export default GeneratePage;
