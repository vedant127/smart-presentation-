import { useState } from 'react';
import axios from 'axios';
import { apiUrl } from '@/lib/api';
import { processPptxResponse } from '@/lib/downloadPptx';
import { Loader2, Download, FileText, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

const CITIES = ['Dubai', 'Abu Dhabi', 'Riyadh', 'Jeddah', 'Doha', 'Kuwait City'];
const PROPERTY_TYPES = ['Luxury Apartments', 'Townhouses', 'Villas', 'Penthouses', 'Studio Apartments'];
const ASSET_CATEGORIES = ['Residential', 'Luxury', 'Mixed-Use', 'Hospitality', 'Retail', 'Office'];
const PRICE_RANGES = ['Under 1M AED', '1M - 2M AED', '2M - 5M AED', 'AED 3M–5M', '5M - 10M AED', '10M+ AED'];
const PRESENTATION_TYPES = ['Feasibility Study', 'Credential Report', 'Investment Memorandum', 'Market Analysis', 'Due Diligence Report'];

export interface PlotData {
  city: string;
  propertyType: string;
  assetCategory: string;
  specifications: string;
}

export interface PptxFormData {
  city: string;
  propertyType: string;
  assetCategory: string;
  numberOfUnits: string;
  priceRange: string;
  clientName: string;
  date: string;
  projectTitle?: string;
  coverTitle?: string;
  coverSubtitle?: string;
  presentationType?: string;
  totalRevenue?: string;
  devCost?: string;
  targetIRR?: string;
  paybackPeriod?: string;
}

const defaultPlot = (): PlotData => ({
  city: 'Dubai',
  propertyType: 'Luxury Apartments',
  assetCategory: 'Residential',
  specifications: '2M - 5M AED',
});

const defaultFormData: PptxFormData = {
  city: '',
  propertyType: '',
  assetCategory: '',
  numberOfUnits: '',
  priceRange: '',
  clientName: '',
  date: new Date().toISOString().split('T')[0],
  projectTitle: '',
  coverTitle: '',
  coverSubtitle: '',
  presentationType: 'Feasibility Study',
};

export const DynamicPptxForm = () => {
  const [formData, setFormData] = useState<PptxFormData>(defaultFormData);
  const [plots, setPlots] = useState<PlotData[]>([defaultPlot()]);
  const [useMultiPlot, setUseMultiPlot] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);

  const handleChange = (field: keyof PptxFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlotChange = (index: number, field: keyof PlotData, value: string) => {
    setPlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addPlot = () => {
    if (plots.length < 5) setPlots((prev) => [...prev, defaultPlot()]);
  };

  const removePlot = (index: number) => {
    if (plots.length > 1) setPlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (useMultiPlot) {
      const invalid = plots.find((p, i) => !p.city || !p.propertyType || !p.assetCategory);
      if (invalid) {
        alert('Each plot must have City, Property Type, and Asset Category.');
        return;
      }
    } else {
      if (!formData.city || !formData.propertyType || !formData.assetCategory) {
        alert('Please fill in City, Property Type, and Asset Category at minimum.');
        return;
      }
    }

    setIsGenerating(true);
    setSuccess(false);

    try {
      const payload = useMultiPlot
        ? {
            plots: plots.map((p) => ({
              city: p.city,
              propertyType: p.propertyType,
              assetCategory: p.assetCategory,
              specifications: p.specifications || formData.priceRange,
              priceRange: p.specifications || formData.priceRange,
            })),
            numberOfUnits: formData.numberOfUnits,
            clientName: formData.clientName,
            date: formData.date,
            projectTitle: formData.projectTitle || `${plots.map((p) => p.city).join(' + ')} Feasibility Study`,
            coverTitle: formData.coverTitle,
            coverSubtitle: formData.coverSubtitle,
            presentationType: formData.presentationType || 'Feasibility Study',
          }
        : { ...formData };

      const response = await axios.post(
        apiUrl('presentations/generate-pptx'),
        payload,
        {
          responseType: 'blob',
          timeout: 60000,
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true,
        }
      );

      const fallbackName = `presentation_${formData.city}_${Date.now()}.pptx`;
      const result = await processPptxResponse(
        response.data,
        response.headers as Record<string, string>,
        response.status,
        fallbackName
      );

      if (!result.success) {
        throw new Error(result.errorMessage || 'Download failed');
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Generation Error:', err);
      alert(`Generation Failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectClasses = "w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";
  const inputClasses = "w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";
  const labelClasses = "block text-sm font-medium text-muted-foreground mb-2";

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <FileText className="text-primary h-5 w-5" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">Project Details</h2>
        </div>

        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Cover Title (gold text on cover)</label>
              <input type="text" className={inputClasses} placeholder="e.g. REAL ESTATE FEASIBILITY STUDY" value={formData.coverTitle || ''} onChange={(e) => handleChange('coverTitle', e.target.value)} />
            </div>
            <div>
              <label className={labelClasses}>Cover Subtitle (location/cities on cover)</label>
              <input type="text" className={inputClasses} placeholder="e.g. DUBAI or ABU DHABI · RIYADH · JEDDAH" value={formData.coverSubtitle || ''} onChange={(e) => handleChange('coverSubtitle', e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className={labelClasses}>Presentation Type (fallback if Cover Title empty)</label>
              <select value={formData.presentationType || 'Feasibility Study'} onChange={(e) => handleChange('presentationType', e.target.value)} className={`${selectClasses} min-w-[180px]`}>
                {PRESENTATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-6">
              <input type="checkbox" checked={useMultiPlot} onChange={(e) => setUseMultiPlot(e.target.checked)} className="rounded border-input bg-background text-primary" />
              <span className="text-muted-foreground">Multi-plot (Riyadh, Abu Dhabi, Dubai, Jeddah…)</span>
            </label>
          </div>
        </div>

        {useMultiPlot ? (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plots ({plots.length}/5)</span>
              {plots.length < 5 && (
                <button type="button" onClick={addPlot} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors">
                  <Plus className="w-4 h-4" /> Add Plot
                </button>
              )}
            </div>
            {plots.map((plot, idx) => (
              <div key={idx} className="bg-muted/50 p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted-foreground bg-background px-2 py-1 rounded">PLOT {idx + 1}</span>
                  {plots.length > 1 && (
                    <button type="button" onClick={() => removePlot(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">City</label>
                    <select value={plot.city} onChange={(e) => handlePlotChange(idx, 'city', e.target.value)} className={`${selectClasses} text-sm py-2`}>
                      {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Property Type</label>
                    <select value={plot.propertyType} onChange={(e) => handlePlotChange(idx, 'propertyType', e.target.value)} className={`${selectClasses} text-sm py-2`}>
                      {PROPERTY_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Asset Category</label>
                    <select value={plot.assetCategory} onChange={(e) => handlePlotChange(idx, 'assetCategory', e.target.value)} className={`${selectClasses} text-sm py-2`}>
                      {ASSET_CATEGORIES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Specs / Price</label>
                    <select value={plot.specifications} onChange={(e) => handlePlotChange(idx, 'specifications', e.target.value)} className={`${selectClasses} text-sm py-2`}>
                      {PRICE_RANGES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!useMultiPlot && (
            <>
              <div>
                <label className={labelClasses}>City *</label>
                <select className={selectClasses} value={formData.city} onChange={(e) => handleChange('city', e.target.value)}>
                  <option value="">Select City</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClasses}>Property Type *</label>
                <select className={selectClasses} value={formData.propertyType} onChange={(e) => handleChange('propertyType', e.target.value)}>
                  <option value="">Select Property Type</option>
                  {PROPERTY_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClasses}>Asset Category *</label>
                <select className={selectClasses} value={formData.assetCategory} onChange={(e) => handleChange('assetCategory', e.target.value)}>
                  <option value="">Select Asset Category</option>
                  {ASSET_CATEGORIES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </>
          )}

          <div>
            <label className={labelClasses}>Number of Units</label>
            <input type="text" className={inputClasses} placeholder="e.g. 150" value={formData.numberOfUnits} onChange={(e) => handleChange('numberOfUnits', e.target.value)} />
          </div>
          <div>
            <label className={labelClasses}>Price Range</label>
            <select className={selectClasses} value={formData.priceRange} onChange={(e) => handleChange('priceRange', e.target.value)}>
              <option value="">Select Price Range</option>
              {PRICE_RANGES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClasses}>Client Name</label>
            <input type="text" className={inputClasses} placeholder="e.g. ABC Developments Ltd" value={formData.clientName} onChange={(e) => handleChange('clientName', e.target.value)} />
          </div>
          <div>
            <label className={labelClasses}>Date</label>
            <input type="date" className={inputClasses} value={formData.date} onChange={(e) => handleChange('date', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClasses}>Project Title (optional)</label>
            <input type="text" className={inputClasses} placeholder="e.g. Marina Heights - Luxury Residential" value={formData.projectTitle || ''} onChange={(e) => handleChange('projectTitle', e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <button type="button" onClick={() => setShowFinancials(!showFinancials)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
              {showFinancials ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Financials (optional — replaces TBD in output)
            </button>
            {showFinancials && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Est. Total Revenue</label>
                  <input type="text" className={`${inputClasses} text-sm py-2`} placeholder="e.g. 450M AED" value={formData.totalRevenue || ''} onChange={(e) => handleChange('totalRevenue', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Est. Dev. Cost</label>
                  <input type="text" className={`${inputClasses} text-sm py-2`} placeholder="e.g. 320M AED" value={formData.devCost || ''} onChange={(e) => handleChange('devCost', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Target IRR</label>
                  <input type="text" className={`${inputClasses} text-sm py-2`} placeholder="e.g. 18%" value={formData.targetIRR || ''} onChange={(e) => handleChange('targetIRR', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Payback Period</label>
                  <input type="text" className={`${inputClasses} text-sm py-2`} placeholder="e.g. 5 years" value={formData.paybackPeriod || ''} onChange={(e) => handleChange('paybackPeriod', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-card"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Generate & Download PPTX
              </>
            )}
          </button>

          {success && (
            <p className="mt-4 text-center text-success text-sm font-medium">✓ Download started successfully.</p>
          )}
        </div>
      </div>
    </div>
  );
};
