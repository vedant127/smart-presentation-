import React, { useState } from 'react';
import axios from 'axios';
import { Loader2, Download, FileText, Building2, MapPin, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export const PresentationGenerator = () => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        city: 'Riyadh',
        assetType: 'Residential',
        plotCount: 1
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGenerate = async () => {
        if (!formData.title) {
            alert("Please enter a project title");
            return;
        }

        setLoading(true);
        setSuccess(false);

        try {
            // Smart prompt engineering: Combine extra fields into subtitle for AI to read
            const enhancedSubtitle = `${formData.subtitle} | Context: ${formData.plotCount} plots in ${formData.city} focusing on ${formData.assetType} development.`;

            const payload = {
                // Using a dummy/legacy ID to satisfy backend validation
                // Valid ID from Database
                presentationTypeId: "6983212564c7c90809f1ffa3",
                formData: {
                    title: formData.title,
                    subtitle: enhancedSubtitle
                },
                plots: []
            };

            const response = await axios.post('http://localhost:5000/api/presentations/create-download', payload, {
                responseType: 'blob', // CRITICAL: Handles the binary PPTX file
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${formData.title.replace(/\s+/g, '_')}_Feasibility.pptx`);
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
                <p className="text-slate-400 mb-8">Your feasibility study has been downloaded successfully.</p>

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
        <div className="max-w-2xl mx-auto">
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
                        <h2 className="text-2xl font-bold text-white">Project Details</h2>
                        <p className="text-slate-400">Enter your project scope for AI analysis</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Project Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. Red Sea Resort Development"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Subtitle */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Subtitle / Context</label>
                        <input
                            type="text"
                            name="subtitle"
                            value={formData.subtitle}
                            onChange={handleChange}
                            placeholder="e.g. Phase 1 Investment Proposal"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* City */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Location
                            </label>
                            <select
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option>Riyadh</option>
                                <option>Jeddah</option>
                                <option>Dubai</option>
                                <option>Neom</option>
                                <option>London</option>
                            </select>
                        </div>

                        {/* Asset Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Asset Type
                            </label>
                            <select
                                name="assetType"
                                value={formData.assetType}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option>Residential</option>
                                <option>Commercial Office</option>
                                <option>Mixed-Use</option>
                                <option>Hospitality (Hotel)</option>
                                <option>Industrial</option>
                            </select>
                        </div>
                    </div>

                    {/* Plots */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                            <Layers className="w-4 h-4" /> Number of Plots
                        </label>
                        <input
                            type="number"
                            name="plotCount"
                            min={1}
                            max={10}
                            value={formData.plotCount}
                            onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all
                        ${loading
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-primary to-indigo-600 text-white hover:scale-[1.02] hover:shadow-xl'
                            }
                    `}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" /> Generating AI Report...
                            </span>
                        ) : (
                            "Generate Presentation"
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
