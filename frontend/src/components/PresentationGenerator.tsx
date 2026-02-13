export const PresentationGenerator = () => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Presentation Type State
    const [presentationType, setPresentationType] = useState("Feasibility Study");
    const [plotCount, setPlotCount] = useState(1);

    // Plots State
    const [plots, setPlots] = useState([
        { city: 'Abu Dhabi', assetType: 'Hotels', category: '5-star', specs: 'Business' }
    ]);

    const [formData, setFormData] = useState({
        title: '',
        subtitle: ''
    });

    // Handle Title/Subtitle Change
    const handleBasicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle Plot Count Change
    const handlePlotCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = parseInt(e.target.value) || 1;
        setPlotCount(count);

        // Adjust plots array size
        const newPlots = [...plots];
        if (count > newPlots.length) {
            // Add new plots
            for (let i = newPlots.length; i < count; i++) {
                newPlots.push({ city: 'Abu Dhabi', assetType: 'Hotels', category: '5-star', specs: 'Business' });
            }
        } else if (count < newPlots.length) {
            // Remove plots
            newPlots.splice(count);
        }
        setPlots(newPlots);
    };

    // Handle Individual Plot Change
    const handlePlotChange = (index: number, field: string, value: string) => {
        const newPlots = [...plots];
        newPlots[index] = { ...newPlots[index], [field]: value };
        setPlots(newPlots);
    };

    const handleGenerate = async () => {
        if (!formData.title) {
            alert("Please enter a project title");
            return;
        }

        setLoading(true);
        setSuccess(false);

        try {
            const payload = {
                // Hardcoded ID for Feasibility Study or dynamic if we had an API for types
                presentationTypeId: "6983212564c7c90809f1ffa3",
                type: presentationType,
                formData: {
                    title: formData.title,
                    subtitle: formData.subtitle
                },
                plots: plots // Send the detailed plots array
            };

            const response = await axios.post('http://localhost:5000/api/presentations/create-download', payload, {
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${formData.title.replace(/\s+/g, '_')}_${presentationType.replace(/\s+/g, '_')}.pptx`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setSuccess(true);
        } catch (err) {
            console.error(err);
            alert("Presentation generation failed. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl mx-auto mt-10 p-8 bg-surface rounded-2xl border border-secondary/20 text-center shadow-2xl">
                <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Download className="text-secondary w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Presentation Ready!</h2>
                <p className="text-slate-400 mb-8">Your {presentationType} has been downloaded successfully.</p>

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
                            <label className="block text-sm font-medium text-slate-300 mb-2">Project Title</label>
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

                    {/* Global Settings */}
                    <div className="grid grid-cols-2 gap-6 bg-slate-800/30 p-6 rounded-2xl border border-slate-700/30">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Layers className="w-4 h-4" /> Presentation Type
                            </label>
                            <select
                                value={presentationType}
                                onChange={(e) => setPresentationType(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option>Feasibility Study</option>
                                <option>Market Research</option>
                                <option>Investment Teaser</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Layers className="w-4 h-4" /> Number of Plots
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={plotCount}
                                onChange={handlePlotCountChange}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>

                    {/* Dynamic Plots */}
                    <div className="space-y-4">
                        <label className="block text-lg font-semibold text-white">Plot Details</label>
                        {plots.map((plot, index) => (
                            <div key={index} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 relative">
                                <div className="absolute top-4 right-4 text-xs font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded">
                                    PLOT {index + 1}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* City */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">City</label>
                                        <select
                                            value={plot.city}
                                            onChange={(e) => handlePlotChange(index, 'city', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option>Abu Dhabi</option>
                                            <option>Riyadh</option>
                                            <option>Dubai</option>
                                            <option>Jeddah</option>
                                            <option>Neom</option>
                                            <option>London</option>
                                        </select>
                                    </div>
                                    {/* Asset Type */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Asset Type</label>
                                        <select
                                            value={plot.assetType}
                                            onChange={(e) => handlePlotChange(index, 'assetType', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option>Hotels</option>
                                            <option>Residential</option>
                                            <option>Commercial</option>
                                            <option>Mixed-Use</option>
                                            <option>Industrial</option>
                                        </select>
                                    </div>
                                    {/* Category */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                                        <select
                                            value={plot.category}
                                            onChange={(e) => handlePlotChange(index, 'category', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option>5-star</option>
                                            <option>4-star</option>
                                            <option>Luxury</option>
                                            <option>Mid-Scale</option>
                                            <option>Budget</option>
                                        </select>
                                    </div>
                                    {/* Specs */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Specs</label>
                                        <select
                                            value={plot.specs}
                                            onChange={(e) => handlePlotChange(index, 'specs', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option>Business</option>
                                            <option>Resort</option>
                                            <option>Apartments</option>
                                            <option>Villas</option>
                                            <option>Serviced</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all mt-4
                        ${loading
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-primary to-indigo-600 text-white hover:scale-[1.02] hover:shadow-xl'
                            }
                    `}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" /> Assembling Presentation...
                            </span>
                        ) : (
                            "Generate & Download PPTX"
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
