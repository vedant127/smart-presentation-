import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { DynamicGenerator } from "@/components/generator/DynamicGenerator";
import { DynamicPptxForm } from "@/components/generator/DynamicPptxForm";

const GeneratePage = () => {
  const [mode, setMode] = useState<'schema' | 'simple'>('simple');

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        title="Generate Presentation"
        description="Create a new presentation by filling in the project details."
      />

      <div className="flex-1 overflow-auto p-8">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('simple')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'simple' ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Dynamic PPTX (Simple Form)
          </button>
          <button
            onClick={() => setMode('schema')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'schema' ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Feasibility Study (Schema)
          </button>
        </div>

        {mode === 'simple' ? <DynamicPptxForm /> : <DynamicGenerator />}
      </div>
    </div>
  );
};

export default GeneratePage;
