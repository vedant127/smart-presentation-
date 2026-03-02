import { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl } from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X, Layers, ListFilter, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const TypeBuilder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [form, setForm] = useState({
        name: '',
        description: '',
        enablePlots: false,
        criteria: [] as any[],
        sections: [] as any[]
    });

    useEffect(() => {
        if (isEdit) {
            axios.get(apiUrl(`presentation-types/${id}`))
                .then(res => setForm(res.data.data.presentationType))
                .catch(console.error);
        }
    }, [id]);

    const handleSave = async () => {
        try {
            if (isEdit) {
                await axios.put(apiUrl(`presentation-types/${id}`), form);
            } else {
                await axios.post(apiUrl('presentation-types'), form);
            }
            navigate('/admin');
        } catch (err) {
            alert("Error saving type");
        }
    };

    // --- Criteria Handlers ---
    const addCriteria = () => {
        setForm(prev => ({
            ...prev,
            criteria: [...prev.criteria, { name: '', type: 'single', options: [], required: true }]
        }));
    };

    const updateCriteria = (idx: number, field: string, value: any) => {
        const newCriteria = [...form.criteria];
        newCriteria[idx] = { ...newCriteria[idx], [field]: value };
        setForm({ ...form, criteria: newCriteria });
    };

    const removeCriteria = (idx: number) => {
        const newCriteria = form.criteria.filter((_, i) => i !== idx);
        setForm({ ...form, criteria: newCriteria });
    };

    // --- Section Handlers --- //
    const addSection = () => {
        setForm(prev => ({
            ...prev,
            sections: [...prev.sections, { name: '', folderPath: '', isVarying: false, varyingCriteria: [], order: prev.sections.length + 1 }]
        }));
    };

    const updateSection = (idx: number, field: string, value: any) => {
        const newSections = [...form.sections];
        newSections[idx] = { ...newSections[idx], [field]: value };
        setForm({ ...form, sections: newSections });
    };

    const removeSection = (idx: number) => {
        setForm(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== idx) }));
    };

    return (
        <div className="max-w-5xl mx-auto p-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Presentation Type' : 'Create New Type'}</h1>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-primary hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                    <Save className="w-5 h-5" /> Save Changes
                </button>
            </div>

            <div className="space-y-8">
                {/* 1. Basic Info */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-surface border border-slate-700 p-6 rounded-2xl">
                    <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Type Name</label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Sales Pitch Deck"
                            />
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary"
                                    checked={form.enablePlots}
                                    onChange={e => setForm({ ...form, enablePlots: e.target.checked })}
                                />
                                <span className="text-white font-medium">Enable Multiple Plots?</span>
                            </label>
                        </div>
                    </div>
                </motion.div>

                {/* 2. Criteria Definition */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-surface border border-slate-700 p-6 rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <ListFilter className="w-5 h-5 text-secondary" />
                            Definde Criteria
                        </h2>
                        <button onClick={addCriteria} className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-600 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add Criterion
                        </button>
                    </div>

                    <div className="space-y-4">
                        {form.criteria.map((c, idx) => (
                            <div key={idx} className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl relative group">
                                <button onClick={() => removeCriteria(idx)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500">Name</label>
                                        <input
                                            className="w-full bg-slate-800 border-slate-700 rounded px-3 py-2 text-sm text-white"
                                            value={c.name}
                                            onChange={e => updateCriteria(idx, 'name', e.target.value)}
                                            placeholder="e.g. Industry"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">Input Type</label>
                                        <select
                                            className="w-full bg-slate-800 border-slate-700 rounded px-3 py-2 text-sm text-white"
                                            value={c.type}
                                            onChange={e => updateCriteria(idx, 'type', e.target.value)}
                                        >
                                            <option value="single">Single Choice</option>
                                            <option value="multiple">Multiple Choice</option>
                                            <option value="text">Text Input</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">Options (comma separated)</label>
                                        <input
                                            className="w-full bg-slate-800 border-slate-700 rounded px-3 py-2 text-sm text-white"
                                            value={c.options ? c.options.join(', ') : ''}
                                            onChange={e => updateCriteria(idx, 'options', e.target.value.split(',').map((s: string) => s.trim()))}
                                            placeholder="Tech, Finance, Health"
                                            disabled={c.type === 'text'}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {form.criteria.length === 0 && <p className="text-slate-500 text-sm text-center italic">No criteria defined yet.</p>}
                    </div>
                </motion.div>

                {/* 3. Sections Configuration */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-surface border border-slate-700 p-6 rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" />
                            Sections Structure
                        </h2>
                        <button onClick={addSection} className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-600 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add Section
                        </button>
                    </div>

                    <div className="space-y-4">
                        {form.sections.map((s, idx) => (
                            <div key={idx} className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl flex gap-4 items-start relative group">
                                <span className="text-slate-600 font-mono text-xs mt-3">#{idx + 1}</span>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-4">
                                        <label className="text-xs text-slate-500">Section Name</label>
                                        <input
                                            className="w-full bg-slate-800 border-slate-700 rounded px-3 py-2 text-sm text-white"
                                            value={s.name}
                                            onChange={e => updateSection(idx, 'name', e.target.value)}
                                            placeholder="e.g. Market Analysis"
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="text-xs text-slate-500">Folder Path</label>
                                        <input
                                            className="w-full bg-slate-800 border-slate-700 rounded px-3 py-2 text-sm text-white"
                                            value={s.folderPath}
                                            onChange={e => updateSection(idx, 'folderPath', e.target.value)}
                                            placeholder="e.g. 02_market_analysis"
                                        />
                                    </div>
                                    <div className="md:col-span-2 pt-6">
                                        <label className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg transition-colors ${s.isVarying ? 'bg-indigo-900/50 border border-indigo-500/50' : 'hover:bg-slate-800'}`}>
                                            <input
                                                type="checkbox"
                                                className="rounded bg-slate-800 border-slate-700 w-5 h-5 text-indigo-500 focus:ring-indigo-500"
                                                checked={s.isVarying}
                                                onChange={e => updateSection(idx, 'isVarying', e.target.checked)}
                                            />
                                            <span className={`text-sm font-medium ${s.isVarying ? 'text-indigo-300' : 'text-slate-400'}`}>
                                                {s.isVarying ? 'Varying Content' : 'Fixed Content'}
                                            </span>
                                        </label>
                                    </div>
                                    {s.isVarying && (
                                        <div className="md:col-span-12 mt-2 bg-indigo-950/30 border border-indigo-500/30 p-4 rounded-lg">
                                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Varying Rules Configuration</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs text-indigo-300 mb-1 block">Dependant Criteria (e.g. City)</label>
                                                    <select
                                                        className="w-full bg-slate-900 border border-indigo-500/50 rounded px-3 py-2 text-sm text-white"
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (!val) return;
                                                            const current = s.varyingCriteria || [];
                                                            if (!current.includes(val)) updateSection(idx, 'varyingCriteria', [...current, val]);
                                                        }}
                                                    >
                                                        <option value="">+ Add Dependency</option>
                                                        {form.criteria.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-indigo-300 mb-1 block">Selected Dependencies</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {s.varyingCriteria?.length === 0 && <span className="text-xs text-slate-500 italic">No dependencies selected. This section will repeat for every plot but content won't filter by specific criteria.</span>}
                                                        {s.varyingCriteria?.map((vc: string) => (
                                                            <span key={vc} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-md shadow-sm flex items-center gap-2">
                                                                {vc}
                                                                <button
                                                                    onClick={() => updateSection(idx, 'varyingCriteria', s.varyingCriteria.filter((x: string) => x !== vc))}
                                                                    className="hover:text-red-300"
                                                                >×</button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => removeSection(idx)} className="text-slate-600 hover:text-red-400 p-2">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
