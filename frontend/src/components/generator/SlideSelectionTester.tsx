
import React, { useState } from 'react';
import axios from 'axios';
import { Search, CheckCircle2, ListFilter, Building2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export const SlideSelectionTester = () => {
    const [city, setCity] = useState('Mumbai');
    const [projectType, setProjectType] = useState('Residential');
    const [types, setTypes] = useState<any[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState('');
    const [downloading, setDownloading] = useState(false);

    // RESTORED MISSING STATE
    const [requirements, setRequirements] = useState<string[]>([]);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const availableRequirements = [
        "Financial Analysis",
        "Market Analysis",
        "Investment Assumptions",
        "Cash Flow Projections"
    ];

    // State for dynamic options
    const [cityOptions, setCityOptions] = useState<string[]>([]);
    const [projectTypeOptions, setProjectTypeOptions] = useState<string[]>([]);

    // Fetch types on mount
    React.useEffect(() => {
        axios.get('http://localhost:5000/api/presentation-types?isActive=true')
            .then(res => {
                const fetchedTypes = res.data.data.presentationTypes;
                setTypes(fetchedTypes);
                // Default to first type if available
                if (fetchedTypes.length > 0) {
                    const defaultType = fetchedTypes.find((t: any) => t.name === 'Feasibility Study') || fetchedTypes[0];
                    setSelectedTypeId(defaultType._id);
                }
            })
            .catch(console.error);
    }, []);

    // Fetch Schema when Type Changes
    React.useEffect(() => {
        if (!selectedTypeId) return;

        axios.get(`http://localhost:5000/api/presentation-types/${selectedTypeId}/form-schema`)
            .then(res => {
                const criteria = res.data.data.formSchema.criteria;

                // Find City Options
                const cityCrit = criteria.find((c: any) => c.name === 'City');
                if (cityCrit) setCityOptions(cityCrit.options || []);

                // Find Asset Type Options
                const typeCrit = criteria.find((c: any) => c.name === 'Asset Type');
                if (typeCrit) setProjectTypeOptions(typeCrit.options || []);

                // Reset selections if current invalid?
                // setCity(''); setProjectType('');
            })
            .catch(err => console.error("Failed to fetch schema", err));
    }, [selectedTypeId]);

    const toggleRequirement = (req: string) => {
        setRequirements(prev =>
            prev.includes(req)
                ? prev.filter(r => r !== req)
                : [...prev, req]
        );
    };

    const handleTestSelection = async () => {
        setLoading(true);
        try {
            const response = await axios.post('http://localhost:5000/api/templates/match', {
                city,
                assetType: projectType,
                // Pass extra context if needed by backend matchTemplate
                category: requirements.length > 0 ? requirements[0] : "General",
                specifications: "Luxury" // Default for test
            });
            setResult(response.data.data); // Backend now returns { _id, city, assetType, slides } in data
        } catch (error) {
            console.error(error);
            alert("Failed to fetch slides");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!selectedTypeId) return alert("No presentation template available");
        setDownloading(true);
        try {
            const payload = {
                presentationTypeId: selectedTypeId,
                formData: {
                    title: `Test ${city} ${projectType}`,
                    subtitle: "Generated via Slide Selection Tester",
                    city,
                    assetType: projectType, // standardized key
                    projectType, // keep for safety
                    Category: "General",
                    Specifications: "Luxury" // Default for test
                },
                plots: []
            };

            const response = await axios.post('http://localhost:5000/api/presentations/create-download', payload, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Test_Selection_${city}.pptx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error(error);
            alert("Download failed");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-10">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-slate-700 rounded-2xl p-8 shadow-xl"
            >
                <div className="flex items-center gap-4 mb-8 border-b border-slate-700 pb-6">
                    <div className="p-3 bg-secondary/20 rounded-xl">
                        <ListFilter className="text-secondary w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Slide Selection Engine</h2>
                        <p className="text-slate-400">Test the backend's smart filtering logic</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Inputs */}
                    <div className="space-y-6">
                        {/* Hidden Template Selector (Auto-selects first active) but visible for debug */}
                        <div>
                            <label className="block text-sm text-slate-500 mb-1">Base Template</label>
                            <select
                                value={selectedTypeId}
                                onChange={e => setSelectedTypeId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-400"
                            >
                                {types.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Target City
                            </label>
                            <select
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-secondary"
                            >
                                <option value="">Select City</option>
                                {cityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Project Type
                            </label>
                            <select
                                value={projectType}
                                onChange={(e) => setProjectType(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-secondary"
                            >
                                <option value="">Select Type</option>
                                {projectTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Requirements removed as they are not used in new logic, or we can keep dummy */}
                    </div>
                    <label className="block text-sm text-slate-400 mb-3">Requirements</label>
                    <div className="space-y-3">
                        {availableRequirements.map(req => (
                            <label key={req} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors border border-slate-800">
                                <input
                                    type="checkbox"
                                    checked={requirements.includes(req)}
                                    onChange={() => toggleRequirement(req)}
                                    className="w-5 h-5 rounded border-slate-600 text-secondary focus:ring-secondary bg-slate-800"
                                />
                                <span className="text-slate-300">{req}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleTestSelection}
                        disabled={loading}
                        className="w-full py-4 mt-4 bg-secondary hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-secondary/20 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? "Analyzing..." : <><Search className="w-5 h-5" /> Find Matching Slides</>}
                    </button>

                    {result && (
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium border border-slate-700 transition-all flex items-center justify-center gap-2"
                        >
                            {downloading ? "Generating PPTX..." : "Download Presentation PPTX"}
                        </button>
                    )}
                </div>
        </div>

                    {/* Results */ }
    <div className="bg-slate-950 rounded-xl border border-slate-800 p-6 h-full min-h-[400px] overflow-auto relative">
        {!result ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <ListFilter className="w-12 h-12 mb-4 opacity-20" />
                <p>Select criteria and hit find to see matched slides</p>
            </div>
        ) : (
            <div>
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-950 pb-4 border-b border-slate-800">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <CheckCircle2 className="text-green-400 w-5 h-5" />
                        Found {result.totalSlides} Slides
                    </h3>

                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">JSON Response</span>
                </div>

                <div className="space-y-3">
                    {result.selectedSlides.map((slide: any, idx: number) => (
                        <div key={idx} className="bg-slate-900 p-4 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-mono text-xs text-secondary bg-secondary/10 px-2 py-0.5 rounded">{slide.id}</span>
                                <span className="text-xs text-slate-500">{slide.category}</span>
                            </div>
                            <h4 className="text-slate-200 font-medium mb-1">{slide.title}</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {slide.tags.map((t: string) => (
                                    <span key={t} className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">#{t}</span>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-800/50 flex gap-4 text-xs text-slate-500">
                                <span>File: {slide.sourceFile}</span>
                                <span>Slide: {slide.slideNumber}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800">
                    <details>
                        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">View Raw JSON</summary>
                        <pre className="mt-2 text-[10px] text-slate-400 overflow-x-auto">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </details>
                </div>
            </div>
        )}
    </div>
                </div >
            </motion.div >
        </div >
    );
};
