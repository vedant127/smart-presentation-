import { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl } from '@/lib/api';
import { processPptxResponse } from '@/lib/downloadPptx';
import { Loader2, Download, FileText, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export const DynamicGenerator = () => {
    const [types, setTypes] = useState<any[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState('');
    const [schema, setSchema] = useState<any>(null);
    const [loadingSchema, setLoadingSchema] = useState(false);

    const [formData, setFormData] = useState<any>({});
    const [plots, setPlots] = useState<any[]>([{ id: 1, data: {} }]); // Init with 1 plot

    // UI States
    const [isGenerating, setIsGenerating] = useState(false);
    const [success, setSuccess] = useState(false);

    // 1. Fetch Types on Mount
    useEffect(() => {
        axios.get(apiUrl('presentation-types?isActive=true'))
            .then(res => setTypes(res.data.data.presentationTypes))
            .catch(console.error);
    }, []);

    // 2. Fetch Schema when Type Selection Changes
    useEffect(() => {
        if (!selectedTypeId) {
            setSchema(null);
            return;
        }
        setLoadingSchema(true);
        axios.get(apiUrl(`presentation-types/${selectedTypeId}/form-schema`))
            .then(res => {
                setSchema(res.data.data.formSchema);
                // Reset form state
                setFormData({ title: '', subtitle: '' });
                setPlots([{ id: 1, data: {} }]);
            })
            .catch(console.error)
            .finally(() => setLoadingSchema(false));
    }, [selectedTypeId]);


    // --- Handlers ---
    const handleGlobalChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handlePlotChange = (plotIdx: number, field: string, value: any) => {
        const newPlots = [...plots];
        newPlots[plotIdx].data = { ...newPlots[plotIdx].data, [field]: value };
        setPlots(newPlots);
    };

    const updatePlotCount = (count: number) => {
        const currentSize = plots.length;
        if (count > currentSize) {
            const toAdd = count - currentSize;
            const newPlots = [...plots];
            for (let i = 0; i < toAdd; i++) {
                newPlots.push({ id: Date.now() + i, data: {} });
            }
            setPlots(newPlots);
        } else if (count < currentSize) {
            setPlots(plots.slice(0, count));
        }
    };

    const addPlot = () => updatePlotCount(plots.length + 1);
    const removePlot = (idx: number) => {
        setPlots(prev => prev.filter((_, i) => i !== idx));
    };

    const handleGenerate = async () => {
        if (!formData.title) return alert("Title is required");

        // VALIDATION: Check if all plot fields have values
        if (schema.enablePlots) {
            for (let i = 0; i < plots.length; i++) {
                const plot = plots[i];
                for (const criterion of schema.criteria) {
                    if (!plot.data[criterion.name]) {
                        alert(`Please select a value for ${criterion.name} in Plot ${i + 1}`);
                        return;
                    }
                }
            }
        } else {
            // Validate global fields if any
            for (const criterion of schema.criteria) {
                if (!formData[criterion.name]) {
                    alert(`Please select a value for ${criterion.name}`);
                    return;
                }
            }
        }

        setIsGenerating(true);
        setSuccess(false);

        try {
            // Build payload exactly as the backend expects
            const enhancedFormData = {
                title: formData.title,
                projectName: formData.title,
                subtitle: formData.subtitle,
                clientName: formData.clientName || 'Confidential Client',
                ...formData,
                ...(schema.enablePlots && plots.length > 0 ? plots[0].data : {}),
                plotCount: plots.length,
                presentationType: schema.name
            };

            const payload = {
                presentationTypeId: selectedTypeId,
                formData: enhancedFormData,
                plots: schema.enablePlots ? plots.map(p => ({
                    criteria: p.data,
                    data: p.data
                })) : []
            };

            console.log('🚀 Sending to backend:', JSON.stringify(payload, null, 2));

            // POST with blob response type + 120s timeout for large files
            const response = await axios.post(
                apiUrl('presentations/create-download'),
                payload,
                {
                    responseType: 'blob',
                    timeout: 120000,
                    headers: { 'Content-Type': 'application/json' },
                    validateStatus: () => true, // Don't throw on 4xx/5xx — we handle blob manually
                }
            );

            const fallbackName = `${(formData.title || 'Presentation').replace(/\s+/g, '_')}_${Date.now()}.pptx`;
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
            console.log(`✅ Download started: ${result.filename} (${(response.data.size / 1024 / 1024).toFixed(2)} MB)`);

        } catch (err: any) {
            console.error('Presentation Generation Error:', err);

            let errorMessage = 'Unknown error occurred';

            if (err.response && err.response.data instanceof Blob) {
                // Error came back as blob (because responseType: 'blob')
                try {
                    const text = await err.response.data.text();
                    const errorJson = JSON.parse(text);
                    errorMessage = errorJson.message || 'Generation failed';
                } catch {
                    errorMessage = `Server error (HTTP ${err.response.status})`;
                }
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }

            alert(`Generation Failed: ${errorMessage}`);
        } finally {
            setIsGenerating(false);
        }
    };


    // --- Renderers ---

    // Render a single criterion input (Dropdown/Text)
    const renderInput = (criteria: any, value: any, onChange: (val: any) => void) => {
        if (criteria.type === 'single' && criteria.options?.length > 0) {
            return (
                <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                >
                    <option value="">Select an option</option>
                    {criteria.options.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }

        return (
            <input
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder={`Enter ${criteria.name} (e.g. New Value)`}
            />
        );
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Step 1: Type Selection */}
            <div className="mb-8 animate-fade-in">
                <label className="block text-slate-400 mb-2 font-medium">Select Presentation Type</label>
                <select
                    className="w-full text-lg bg-surface border border-slate-700 rounded-xl px-6 py-4 text-white focus:ring-2 focus:ring-primary shadow-lg"
                    value={selectedTypeId}
                    onChange={e => setSelectedTypeId(e.target.value)}
                >
                    <option value="">-- Choose a Template --</option>
                    {types.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
            </div>

            {/* Step 2: Dynamic Form */}
            {schema && (
                <div className="space-y-8 animate-fade-in">

                    {/* Global Inputs */}
                    <div className="bg-surface border border-slate-700 rounded-2xl p-8 shadow-xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-primary/20 rounded-xl"><FileText className="text-primary" /></div>
                            <h2 className="text-2xl font-bold text-white">Project Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Project Title *</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                    value={formData.title} onChange={e => handleGlobalChange('title', e.target.value)}
                                    placeholder="e.g., Luxury Residences Dubai Marina"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Subtitle</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                    value={formData.subtitle} onChange={e => handleGlobalChange('subtitle', e.target.value)}
                                    placeholder="e.g., Feasibility Study Report"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Client Name</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                    value={formData.clientName || ''} onChange={e => handleGlobalChange('clientName', e.target.value)}
                                    placeholder="e.g., ABC Developments Ltd"
                                />
                            </div>
                        </div>

                        {/* Global Criteria (If any - technically criteria are per plot if enabled, but let's assume global ones exist too? 
                           For now, we map ALL criteria here if plots NOT enabled. If plots enabled, we map inside plots) 
                        */}
                        {!schema.enablePlots && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {schema.criteria.map((c: any) => (
                                    <div key={c.name}>
                                        <label className="block text-sm text-slate-400 mb-2">{c.name}</label>
                                        {renderInput(c, formData[c.name], (val) => handleGlobalChange(c.name, val))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Plots Manager */}
                    {schema.enablePlots && (
                        <div className="bg-surface/50 border border-slate-700 rounded-2xl p-8">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <CheckCircle2 className="text-secondary" />
                                Plot Configuration
                            </h2>

                            <div className="mb-6 flex items-center gap-4">
                                <label className="text-white font-medium">Number of Plots:</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-center font-bold"
                                        value={plots.length}
                                        onChange={(e) => updatePlotCount(parseInt(e.target.value) || 1)}
                                    />
                                    <span className="text-slate-500 text-sm">(Auto-generates forms below)</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {plots.map((plot, idx) => (
                                    <div
                                        key={plot.id}
                                        className="bg-slate-900/80 border border-slate-700 p-6 rounded-xl relative group px-10 animate-fade-in"
                                    >
                                        <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary to-indigo-600 rounded-l-xl"></span>
                                        <div className="absolute top-4 right-4">
                                            {plots.length > 1 && (
                                                <button onClick={() => removePlot(idx)} className="text-slate-600 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-4">Plot {idx + 1}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {schema.criteria.map((c: any) => (
                                                <div key={c.name}>
                                                    <label className="block text-xs text-slate-500 mb-1">{c.name}</label>
                                                    {renderInput(c, plot.data[c.name], (val) => handlePlotChange(idx, c.name, val))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={addPlot} className="mt-6 w-full py-3 border-2 border-dashed border-slate-700 text-slate-400 hover:border-primary hover:text-primary rounded-xl transition-colors flex justify-center items-center gap-2 font-medium">
                                <Plus className="w-5 h-5" /> Add Another Plot
                            </button>
                        </div>
                    )}

                    {/* Generate Action */}
                    <div className="sticky bottom-8">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className={`w-full py-5 rounded-2xl font-bold text-xl shadow-2xl transition-all
                                ${isGenerating
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-secondary to-emerald-600 text-white hover:scale-[1.02] shadow-secondary/20'
                                }
                            `}
                        >
                            {isGenerating ? (
                                <span className="flex items-center justify-center gap-3">
                                    <Loader2 className="animate-spin w-6 h-6" /> Generating Presentation...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-3">
                                    <Download className="w-6 h-6" /> Generate {schema.enablePlots ? `${plots.length} Plot` : 'Full'} Report
                                </span>
                            )}
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};
