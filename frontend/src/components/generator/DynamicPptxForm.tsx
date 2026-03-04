import { useState } from 'react';
import axios from 'axios';
import { apiUrl } from '@/lib/api';
import { processPptxResponse } from '@/lib/downloadPptx';
import { Loader2, Download, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const CITIES = ['Dubai', 'Abu Dhabi', 'Riyadh', 'Jeddah', 'Doha', 'Kuwait City'];
const PROPERTY_TYPES = ['Luxury Apartments', 'Townhouses', 'Villas', 'Penthouses', 'Studio Apartments'];
const ASSET_CATEGORIES = ['Residential', 'Luxury', 'Mixed-Use', 'Hospitality', 'Retail', 'Office'];
const PRICE_RANGES = ['Under 1M AED', '1M - 2M AED', '2M - 5M AED', 'AED 3M–5M', '5M - 10M AED', '10M+ AED'];

export interface PptxFormData {
  city: string;
  propertyType: string;
  assetCategory: string;
  numberOfUnits: string;
  priceRange: string;
  clientName: string;
  date: string;
  projectTitle?: string;
  totalRevenue?: string;
  devCost?: string;
  targetIRR?: string;
  paybackPeriod?: string;
}

const defaultFormData: PptxFormData = {
  city: '',
  propertyType: '',
  assetCategory: '',
  numberOfUnits: '',
  priceRange: '',
  clientName: '',
  date: new Date().toISOString().split('T')[0],
  projectTitle: '',
};

export const DynamicPptxForm = () => {
  const [formData, setFormData] = useState<PptxFormData>(defaultFormData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);

  const handleChange = (field: keyof PptxFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!formData.city || !formData.propertyType || !formData.assetCategory) {
      alert('Please fill in City, Property Type, and Asset Category at minimum.');
      return;
    }

    setIsGenerating(true);
    setSuccess(false);

    try {
      const response = await axios.post(
        apiUrl('presentations/generate-pptx'),
        formData,
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

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="bg-surface border border-slate-700 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-primary/20 rounded-xl">
            <FileText className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white">Project Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">City *</label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
            >
              <option value="">Select City</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Property Type *</label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              value={formData.propertyType}
              onChange={(e) => handleChange('propertyType', e.target.value)}
            >
              <option value="">Select Property Type</option>
              {PROPERTY_TYPES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Asset Category *</label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              value={formData.assetCategory}
              onChange={(e) => handleChange('assetCategory', e.target.value)}
            >
              <option value="">Select Asset Category</option>
              {ASSET_CATEGORIES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Number of Units</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              placeholder="e.g. 150"
              value={formData.numberOfUnits}
              onChange={(e) => handleChange('numberOfUnits', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Price Range</label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              value={formData.priceRange}
              onChange={(e) => handleChange('priceRange', e.target.value)}
            >
              <option value="">Select Price Range</option>
              {PRICE_RANGES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Client Name</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              placeholder="e.g. ABC Developments Ltd"
              value={formData.clientName}
              onChange={(e) => handleChange('clientName', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Date</label>
            <input
              type="date"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-slate-400 mb-2">Project Title (optional)</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              placeholder="e.g. Marina Heights - Luxury Residential"
              value={formData.projectTitle || ''}
              onChange={(e) => handleChange('projectTitle', e.target.value)}
            />
          </div>

          {/* Optional Financials */}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => setShowFinancials(!showFinancials)}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"
            >
              {showFinancials ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Financials (optional — replaces TBD in output)
            </button>
            {showFinancials && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Est. Total Revenue</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. 450M AED" value={formData.totalRevenue || ''} onChange={(e) => handleChange('totalRevenue', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Est. Dev. Cost</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. 320M AED" value={formData.devCost || ''} onChange={(e) => handleChange('devCost', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Target IRR</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. 18%" value={formData.targetIRR || ''} onChange={(e) => handleChange('targetIRR', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Payback Period</label>
                  <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. 5 years" value={formData.paybackPeriod || ''} onChange={(e) => handleChange('paybackPeriod', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <p className="mt-4 text-center text-green-400 text-sm">✓ Download started successfully.</p>
          )}
        </div>
      </div>
    </div>
  );
};
