import { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl } from '@/lib/api';
import { Search, Database, FileText, Check, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

export const DataManager = () => {
    // State for Filter Options
    const [cityOptions, setCityOptions] = useState<string[]>([]);
    const [projectTypeOptions, setProjectTypeOptions] = useState<string[]>([]);
    const [sections, setSections] = useState<any[]>([]);

    // Selection State
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedProjectType, setSelectedProjectType] = useState('');
    const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

    // Results State
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [matches, setMatches] = useState<any>(null); // Raw JSON
    const [feasibilityTypeId, setFeasibilityTypeId] = useState<string>('');

    // Initialization
    useEffect(() => {
        // Fetch Feasibility Study type to get options
        axios.get(apiUrl('presentation-types?isActive=true'))
            .then(res => {
                const types = res.data.data.presentationTypes;
                const feasibility = types.find((t: any) => t.name === 'Feasibility Study');

                if (feasibility) {
                    setFeasibilityTypeId(feasibility._id);
                    const cityCrit = feasibility.criteria.find((c: any) => c.name === 'City');
                    const typeCrit = feasibility.criteria.find((c: any) => c.name === 'Asset Type');

                    if (cityCrit) setCityOptions(cityCrit.options || []);
                    if (typeCrit) setProjectTypeOptions(typeCrit.options || []);

                    setSections(feasibility.sections.map((s: any) => s.name));
                    // Select all sections by default
                    setSelectedSections(new Set(feasibility.sections.map((s: any) => s.name)));
                } else {
                    console.error("Feasibility Study presentation type not found in API response");
                    // Fallback to first type just in case?
                    if (types.length > 0) {
                        setFeasibilityTypeId(types[0]._id);
                        console.log("Falling back to first available type:", types[0].name);
                    }
                }
            })
            .catch(err => console.error("Failed to load presentation types", err));
    }, []);

    const toggleSection = (section: string) => {
        const newSet = new Set(selectedSections);
        if (newSet.has(section)) newSet.delete(section);
        else newSet.add(section);
        setSelectedSections(newSet);
    };

    const handleSearch = async () => {
        if (!selectedCity || !selectedProjectType) {
            alert("Please select City and Project Type");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(apiUrl('templates/match'), {
                city: selectedCity,
                assetType: selectedProjectType
            });

            if (res.data.success && res.data.data) {
                const template = res.data.data;
                setMatches(template);

                // Filter slides based on checked sections
                const filteredSlides = template.slides.filter((slide: any) =>
                    selectedSections.has(slide.sectionName)
                );

                setResults(filteredSlides);
            }
        } catch (err: any) {
            console.error(err);
            setResults([]);
            setMatches(null);
            if (err.response?.status === 404) {
                alert("No matching template found for criteria");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (results.length === 0) return;
        setGenerating(true);
        try {
            // Prepare payload for generation
            // We need to send: typeId, inputs (city, assetType, etc.), and maybe override slides if backend supports
            // IF backend generation logic fetches slides itself based on type/inputs, then sending inputs is enough.
            // visual "results" here are for confirmation.
            // Let's assume sending inputs is the main way.

            const payload = {
                typeId: feasibilityTypeId,
                formData: {
                    City: selectedCity,
                    "Asset Type": selectedProjectType
                }
            };

            const response = await axios.post(apiUrl('presentations/create-download'), payload, {
                responseType: 'blob' // Important for file download
            });

            // Trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${selectedCity}_${selectedProjectType}_FeasibilityStudy.pptx`);
            document.body.appendChild(link);
            link.click();
            link.remove();

        } catch (err) {
            console.error("Download failed", err);
            alert("Failed to generate presentation. Please check console.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="bg-slate-800 rounded-2xl p-6 mb-8 flex items-center gap-4 shadow-lg border border-slate-700">
                <div className="p-4 bg-emerald-500/10 rounded-xl">
                    <Database className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Slide Selection Engine</h1>
                    <p className="text-slate-400">Test the backend's smart filtering logic</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Panel: Filters */}
                <div className="space-y-6">
                    <div className="bg-surface border border-slate-700 rounded-xl p-6">

                        {/* City */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-indigo-400"></span> Target City
                            </label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedCity}
                                onChange={e => setSelectedCity(e.target.value)}
                            >
                                <option value="">Select City</option>
                                {cityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Project Type */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-indigo-400"></span> Project Type
                            </label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedProjectType}
                                onChange={e => setSelectedProjectType(e.target.value)}
                            >
                                <option value="">Select Type</option>
                                {projectTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Requirements */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-400 mb-3">Requirements</label>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {sections.map(sec => (
                                    <label key={sec} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-700">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                                            ${selectedSections.has(sec) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}
                                        `}>
                                            {selectedSections.has(sec) && <Check className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={selectedSections.has(sec)}
                                            onChange={() => toggleSection(sec)}
                                        />
                                        <span className="text-sm text-slate-300">{sec}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Search Button */}
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all
                                ${loading
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-[1.02] shadow-emerald-500/20'}
                            `}
                        >
                            {loading ? <Search className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                            {loading ? 'Finding...' : 'Find Matching Slides'}
                        </button>

                    </div>
                </div>

                {/* Right Panel: Results */}
                <div className="col-span-1 lg:col-span-2">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl h-full flex flex-col overflow-hidden">

                        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Check className="w-5 h-5 text-emerald-400" />
                                <span className="font-bold text-white text-lg">Found {results.length} Slides</span>
                            </div>
                            <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-500 font-mono">JSON Response</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0B1120]">
                            {results.length > 0 ? (
                                results.map((slide, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-colors group"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded uppercase tracking-wider">
                                                {slide.sectionName.substring(0, 3)}_{selectedCity.substring(0, 3).toUpperCase()}_00{idx + 1}
                                            </span>
                                            <span className="text-xs text-slate-500">{slide.sectionName}</span>
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-3">
                                            {selectedCity} {slide.sectionName}
                                        </h3>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <span className="px-2 py-1 bg-slate-900 rounded-md text-slate-400 text-xs flex items-center gap-1">
                                                <Tag className="w-3 h-3" /> {selectedCity}
                                            </span>
                                            <span className="px-2 py-1 bg-slate-900 rounded-md text-slate-400 text-xs flex items-center gap-1">
                                                <Tag className="w-3 h-3" /> {selectedProjectType}
                                            </span>
                                            <span className="px-2 py-1 bg-slate-900 rounded-md text-slate-400 text-xs flex items-center gap-1">
                                                <Tag className="w-3 h-3" /> #market
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-slate-500 pt-3 border-t border-slate-700/50">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span className="font-mono">
                                                {slide.libraryItemId?.path || 'Unknown File'}
                                            </span>
                                            <span className="ml-auto opacity-50">Slide: {idx + 1} (mock)</span>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="h-40 flex flex-col items-center justify-center text-slate-500">
                                    <Search className="w-8 h-8 mb-2 opacity-20" />
                                    <p>No matching slides found yet.</p>
                                </div>
                            )}

                            {/* Raw JSON View */}
                            {matches && (
                                <div className="mt-8 border-t border-slate-800 pt-6">
                                    <div className="flex items-center gap-2 mb-3 cursor-pointer text-slate-400 hover:text-white transition-colors">
                                        <span className="text-xs font-bold uppercase tracking-wider">▼ View Raw JSON</span>
                                    </div>
                                    <pre className="bg-black/50 p-4 rounded-lg text-emerald-400 text-xs font-mono overflow-x-auto">
                                        {JSON.stringify(matches, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* Download Footer */}
                        {results.length > 0 && (
                            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                                <button
                                    onClick={handleDownload}
                                    disabled={generating}
                                    className={`w-full py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 transition-all
                                        ${generating
                                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.02] shadow-indigo-500/20'}
                                    `}
                                >
                                    {generating ? <span className="animate-pulse">Generating PPT...</span> : <>Download Presentation (.pptx)</>}
                                </button>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
};
