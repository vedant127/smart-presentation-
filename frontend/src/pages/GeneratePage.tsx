import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import StepIndicator from "@/components/StepIndicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { presentationTypes, CITIES, ASSET_TYPES } from "@/data/mockData";
import type { PresentationType, PlotData } from "@/data/mockData";
import { ArrowLeft, ArrowRight, FileDown, Plus, Trash2, MapPin, Building2, Layers, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Presentation Type" },
  { label: "Number of Plots" },
  { label: "Plot Details" },
  { label: "Generate" },
];

const GeneratePage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState<PresentationType | null>(null);
  const [numPlots, setNumPlots] = useState(1);
  const [plots, setPlots] = useState<PlotData[]>([{ id: 1, criteria: {} }]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleTypeSelect = (typeId: string) => {
    const type = presentationTypes.find((t) => t.id === typeId);
    if (type) setSelectedType(type);
  };

  const handleNumPlotsChange = (value: string) => {
    const n = parseInt(value) || 1;
    setNumPlots(n);
    const newPlots: PlotData[] = Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      criteria: plots[i]?.criteria || {},
    }));
    setPlots(newPlots);
  };

  const updatePlotCriteria = (plotIndex: number, criteriaId: string, value: string) => {
    setPlots((prev) =>
      prev.map((p, i) =>
        i === plotIndex
          ? {
              ...p,
              criteria: {
                ...p.criteria,
                [criteriaId]: value,
                ...(criteriaId === "asset-type" ? { category: "", specifications: "" } : {}),
                ...(criteriaId === "category" ? { specifications: "" } : {}),
              },
            }
          : p
      )
    );
  };

  const getCategoriesForAssetType = (assetType: string) => {
    const at = ASSET_TYPES[assetType];
    return at ? Object.keys(at.categories) : [];
  };

  const getSpecsForCategory = (assetType: string, category: string) => {
    const at = ASSET_TYPES[assetType];
    return at?.categories[category] || [];
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
  };

  const canProceed = () => {
    if (currentStep === 0) return !!selectedType;
    if (currentStep === 1) return numPlots >= 1;
    if (currentStep === 2) {
      return plots.every(
        (p) => p.criteria.city && p.criteria["asset-type"] && p.criteria.category && p.criteria.specifications
      );
    }
    return true;
  };

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        title="Generate Presentation"
        description="Create a new presentation by selecting the type and filling in the project details."
      />

      <div className="flex-1 overflow-auto p-8">
        {/* Step Indicator */}
        <div className="mb-8 flex justify-center">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        <div className="mx-auto max-w-3xl animate-fade-in">
          {/* Step 0: Select Presentation Type */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Select Presentation Type</h2>
              <p className="text-sm text-muted-foreground">Choose the type of presentation you want to generate.</p>
              <div className="grid gap-3 mt-4">
                {presentationTypes.map((type) => (
                  <Card
                    key={type.id}
                    className={cn(
                      "cursor-pointer p-5 transition-all duration-200 hover:shadow-card",
                      selectedType?.id === type.id
                        ? "border-accent ring-2 ring-accent/20 bg-accent/5"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                    onClick={() => handleTypeSelect(type.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-display font-semibold text-foreground">{type.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {type.sections.length} sections • {type.criteria.length} criteria
                        </p>
                        <div className="flex gap-2 mt-3">
                          {type.enablePlots && (
                            <Badge variant="secondary" className="text-xs">
                              Multi-plot
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {type.sections.filter((s) => s.varying).length} varying sections
                          </Badge>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "h-5 w-5 rounded-full border-2 transition-all",
                          selectedType?.id === type.id
                            ? "border-accent bg-accent"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selectedType?.id === type.id && (
                          <div className="h-full w-full flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-accent-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Number of Plots */}
          {currentStep === 1 && selectedType?.enablePlots && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-foreground">Number of Plots</h2>
              <p className="text-sm text-muted-foreground">
                How many plots does your project have? Each plot will have its own characteristics.
              </p>
              <Card className="p-6 mt-4">
                <Label htmlFor="numPlots" className="text-sm font-medium text-foreground">
                  Number of Plots
                </Label>
                <Input
                  id="numPlots"
                  type="number"
                  min={1}
                  max={100}
                  value={numPlots}
                  onChange={(e) => handleNumPlotsChange(e.target.value)}
                  className="mt-2 max-w-xs"
                />
                <p className="mt-2 text-xs text-muted-foreground">Up to 100 plots supported</p>
              </Card>
            </div>
          )}

          {/* Step 2: Plot Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="font-display text-lg font-semibold text-foreground">Plot Details</h2>
              <p className="text-sm text-muted-foreground">Fill in the characteristics for each plot.</p>

              {plots.map((plot, plotIndex) => (
                <Card key={plot.id} className="p-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {plot.id}
                      </div>
                      <h3 className="font-display font-semibold text-foreground">Plot {plot.id}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* City */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        City
                      </Label>
                      <Select
                        value={(plot.criteria.city as string) || ""}
                        onValueChange={(v) => updatePlotCriteria(plotIndex, "city", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {CITIES.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Asset Type */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Asset Type
                      </Label>
                      <Select
                        value={(plot.criteria["asset-type"] as string) || ""}
                        onValueChange={(v) => updatePlotCriteria(plotIndex, "asset-type", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select asset type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(ASSET_TYPES).map((at) => (
                            <SelectItem key={at} value={at}>
                              {at}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        Category
                      </Label>
                      <Select
                        value={(plot.criteria.category as string) || ""}
                        onValueChange={(v) => updatePlotCriteria(plotIndex, "category", v)}
                        disabled={!plot.criteria["asset-type"]}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {getCategoriesForAssetType(plot.criteria["asset-type"] as string).map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Specifications */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                        Specifications
                      </Label>
                      <Select
                        value={(plot.criteria.specifications as string) || ""}
                        onValueChange={(v) => updatePlotCriteria(plotIndex, "specifications", v)}
                        disabled={!plot.criteria.category}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select specifications" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSpecsForCategory(
                            plot.criteria["asset-type"] as string,
                            plot.criteria.category as string
                          ).map((spec) => (
                            <SelectItem key={spec} value={spec}>
                              {spec}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Summary */}
                  {plot.criteria.city && plot.criteria["asset-type"] && plot.criteria.category && plot.criteria.specifications && (
                    <div className="mt-4 rounded-lg bg-muted p-3">
                      <p className="text-xs font-medium text-muted-foreground">Generated Key</p>
                      <p className="text-sm font-mono text-foreground mt-0.5">
                        {(plot.criteria.city as string).toLowerCase()} + {(plot.criteria["asset-type"] as string).toLowerCase()} + {(plot.criteria.category as string).toLowerCase()} + {(plot.criteria.specifications as string).toLowerCase()}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Step 3: Generate */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="font-display text-lg font-semibold text-foreground">Review & Generate</h2>
              <p className="text-sm text-muted-foreground">Review your selections and generate the presentation.</p>

              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">Presentation Type</span>
                    <span className="text-sm font-medium text-foreground">{selectedType?.name}</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">Number of Plots</span>
                    <span className="text-sm font-medium text-foreground">{numPlots}</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-sm text-muted-foreground">Total Sections</span>
                    <span className="text-sm font-medium text-foreground">{selectedType?.sections.length}</span>
                  </div>

                  <div className="pt-2">
                    <p className="text-sm font-medium text-foreground mb-3">Plots Summary</p>
                    <div className="space-y-2">
                      {plots.map((plot) => (
                        <div key={plot.id} className="flex items-center gap-3 rounded-lg bg-muted p-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                            {plot.id}
                          </div>
                          <span className="text-sm font-mono text-foreground">
                            {plot.criteria.city && plot.criteria["asset-type"] && plot.criteria.category && plot.criteria.specifications
                              ? `${plot.criteria.city} + ${plot.criteria["asset-type"]} + ${plot.criteria.category} + ${plot.criteria.specifications}`
                              : "Incomplete"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              <Button
                size="lg"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                    Generating Presentation...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FileDown className="h-4 w-4" />
                    Generate Presentation
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-border bg-card px-8 py-4 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {currentStep < 3 && (
          <Button
            onClick={() => setCurrentStep((s) => Math.min(3, s + 1))}
            disabled={!canProceed()}
            className="gap-2"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default GeneratePage;
