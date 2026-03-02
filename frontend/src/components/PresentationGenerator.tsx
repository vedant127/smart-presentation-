
import React, { useState } from 'react';
import axios from 'axios';
import { apiUrl } from '@/lib/api';
import { Download, FileText, Layers, Loader2, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── STATIC OPTIONS derived from library filenames ────────────────────────────
// These MUST match the normalization map in presentationServiceEnhanced.js
const CITY_OPTIONS = ['Abu Dhabi', 'Dubai', 'Riyadh', 'Jeddah'];

const ASSET_TYPES = ['Hotels', 'Residential', 'Office', 'Retail'];

// Per-asset-type sub-options
const CATEGORY_OPTIONS: Record<string, string[]> = {
    Hotels: ['3-star', '4-star', '5-star'],
    Residential: ['Apartments', 'Villas', 'Townhouses'],
    Office: ['Grade A', 'Grade B'],
    Retail: ['Grade A', 'Grade B'],
};

const SPECS_OPTIONS: Record<string, string[]> = {
    Hotels: ['Business', 'City', 'Leisure', 'Beach Resort'],
    Residential: ['Luxury', 'High End', 'Upper Mid End', 'Mid End', 'Low End', 'Affordable', 'Social'],
    Office: ['High Rise', 'Mid Rise', 'Low Rise', 'Business Park'],
    Retail: ['Regional Mall', 'Small Regional Mall', 'Community Mall', 'Neighbourhood Center', 'Convenience Center'],
};

interface Plot {
    city: string;
    assetType: string;
    category: string;
    specs: string;
}

const defaultPlot = (): Plot => ({
    city: 'Dubai',
    assetType: 'Hotels',
    category: '5-star',
    specs: 'Business',
});

export const PresentationGenerator = () => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [presentationType] = useState('Feasibility Study');

    const [plots, setPlots] = useState<Plot[]>([defaultPlot()]);

    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
    });

    const handleBasicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePlotChange = (index: number, field: keyof Plot, value: string) => {
        const newPlots = [...plots];
        const updated = { ...newPlots[index], [field]: value };
        // Reset dependent fields when assetType changes
        if (field === 'assetType') {
            updated.category = CATEGORY_OPTIONS[value]?.[0] || '';
            updated.specs = SPECS_OPTIONS[value]?.[0] || '';
        }
        newPlots[index] = updated;
        setPlots(newPlots);
    };

    const addPlot = () => {
        if (plots.length < 5) setPlots([...plots, defaultPlot()]);
    };

    const removePlot = (index: number) => {
        if (plots.length > 1) setPlots(plots.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        if (!formData.title.trim()) {
            alert('Please enter a project title');
            return;
        }
        for (let i = 0; i < plots.length; i++) {
            const p = plots[i];
            if (!p.city || !p.assetType || !p.category || !p.specs) {
                alert(`Plot ${i + 1}: Please fill in all fields (City, Asset Type, Category, Specs)`);
                return;
            }
        }

        setLoading(true);
        setSuccess(false);

        try {
            const payload = {
                type: presentationType,
                formData: {
                    title: formData.title,
                    subtitle: formData.subtitle,
                },
                plots,
            };

            console.log('[Generate] Sending payload:', JSON.stringify(payload, null, 2));

            const response = await axios.post(apiUrl('presentations/create-download'), payload, {
                responseType: 'blob',
                timeout: 120000, // 2 min timeout for large merges
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute(
                'download',
                `${formData.title.replace(/\s+/g, '_')}_${presentationType.replace(/\s+/g, '_')}.pptx`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setSuccess(true);
        } catch (err: any) {
            console.error('[Generate] Error:', err);
            if (err.response) {
                // Try to read blob error
                try {
                    const text = await err.response.data.text();
                    const parsed = JSON.parse(text);
                    alert(`Error: ${parsed.message || 'Generation failed'}`);
                } catch {
                    alert('Presentation generation failed. Check backend logs.');
                }
            } else {
                alert('Presentation generation failed. Is the backend running?');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl mx-auto mt-10 p-8 bg-surface rounded-2xl border border-secondary/20 text-center shadow-2xl"
            >
                <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Download className="text-secondary w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Presentation Ready!</h2>
                <p className="text-slate-400 mb-8">
                    Your {presentationType} has been downloaded successfully.
                </p>
                <button
                    onClick={() => setSuccess(false)}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                    Generate Another
                </button>
            </motion.div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-xl"
            >
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-primary/20 rounded-xl">
                        <FileText className="text-primary w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Project Configuration</h2>
                        <p className="text-slate-400">Configure your presentation parameters</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Project Title <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleBasicChange}
                                placeholder="e.g. Red Sea Resort"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Subtitle</label>
                            <input
                                type="text"
                                name="subtitle"
                                value={formData.subtitle}
                                onChange={handleBasicChange}
                                placeholder="e.g. Phase 1 Proposal"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>

                    {/* Presentation Type Info */}
                    <div className="flex items-center gap-3 bg-slate-800/30 px-5 py-3 rounded-xl border border-slate-700/30">
                        <Layers className="text-primary w-5 h-5 flex-shrink-0" />
                        <div>
                            <span className="text-sm font-medium text-slate-300">Presentation Type: </span>
                            <span className="text-sm font-bold text-white">{presentationType}</span>
                        </div>
                        <div className="ml-auto text-xs text-slate-500 bg-slate-900/50 px-2 py-1 rounded">
                            Max 11 Slides
                        </div>
                    </div>

                    {/* Dynamic Plots */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-lg font-semibold text-white">
                                Plot Details
                                <span className="text-sm font-normal text-slate-400 ml-2">
                                    ({plots.length}/5 — each plot generates market + dev sections)
                                </span>
                            </label>
                            {plots.length < 5 && (
                                <button
                                    onClick={addPlot}
                                    className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Add Plot
                                </button>
                            )}
                        </div>

                        <AnimatePresence>
                            {plots.map((plot, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 relative"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded">
                                            PLOT {index + 1}
                                        </span>
                                        {plots.length > 1 && (
                                            <button
                                                onClick={() => removePlot(index)}
                                                className="text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* City */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                                City <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                value={plot.city}
                                                onChange={(e) => handlePlotChange(index, 'city', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                <option value="">Select City</option>
                                                {CITY_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Asset Type */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                                Asset Type <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                value={plot.assetType}
                                                onChange={(e) => handlePlotChange(index, 'assetType', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                <option value="">Select Asset Type</option>
                                                {ASSET_TYPES.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Category */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                                Category <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                value={plot.category}
                                                onChange={(e) => handlePlotChange(index, 'category', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                <option value="">Select Category</option>
                                                {(CATEGORY_OPTIONS[plot.assetType] || []).map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Specs */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                                Specs / Type <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                value={plot.specs}
                                                onChange={(e) => handlePlotChange(index, 'specs', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                <option value="">Select Specs</option>
                                                {(SPECS_OPTIONS[plot.assetType] || []).map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Key Preview */}
                                    {plot.city && plot.assetType && plot.category && plot.specs && (
                                        <div className="mt-3 px-3 py-2 bg-slate-900/70 rounded-lg border border-slate-700/30">
                                            <span className="text-xs text-slate-500">Library key: </span>
                                            <span className="text-xs text-primary font-mono">
                                                {[
                                                    plot.city.toLowerCase().replace(/\s+/g, '_'),
                                                    plot.assetType === 'Hotels' ? 'hotel' :
                                                        plot.assetType === 'Residential' ? 'residential' :
                                                            plot.assetType === 'Office' ? 'office' : 'retail',
                                                    plot.category.toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, ''),
                                                    plot.specs.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                                                ].join('_')}
                                            </span>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all mt-4
                        ${loading
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-primary to-indigo-600 text-white hover:scale-[1.02] hover:shadow-xl'
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" /> Assembling Presentation...
                            </span>
                        ) : (
                            'Generate & Download PPTX'
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
