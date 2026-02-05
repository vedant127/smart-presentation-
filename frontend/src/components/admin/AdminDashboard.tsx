import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Settings, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface PresentationType {
    _id: string;
    name: string;
    description?: string;
    sections: any[];
    criteria: any[];
    enablePlots: boolean;
}

export const AdminDashboard = () => {
    const [types, setTypes] = useState<PresentationType[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/presentation-types');
            setTypes(res.data.data.presentationTypes);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure? This cannot be undone.")) return;
        try {
            await axios.delete(`http://localhost:5000/api/presentation-types/${id}`);
            fetchTypes(); // Refresh
        } catch (err) {
            alert("Failed to delete");
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Presentation Configuration</h1>
                    <p className="text-slate-400">Manage templates, criteria, and section rules.</p>
                </div>
                <button
                    onClick={() => navigate('/admin/create')}
                    className="flex items-center gap-2 bg-primary hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" /> Create New Type
                </button>
            </div>

            {loading ? (
                <div className="text-center text-slate-500 py-20">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {types.map((type) => (
                        <motion.div
                            key={type._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-surface border border-slate-700 rounded-2xl p-6 hover:shadow-xl hover:border-primary/30 transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-slate-800 rounded-lg">
                                    <FileText className="text-primary w-6 h-6" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/admin/edit/${type._id}`)}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(type._id)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">{type.name}</h3>
                            <p className="text-slate-400 text-sm mb-6 line-clamp-2 h-10">{type.description || "No description provided."}</p>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Criteria</span>
                                    <span className="text-slate-200 font-medium">{type.criteria.length} defined</span>
                                </div>
                                <div className="bg-slate-700/50 h-px w-full"></div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Sections</span>
                                    <span className="text-slate-200 font-medium">{type.sections.length} total</span>
                                </div>
                                <div className="bg-slate-700/50 h-px w-full"></div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Plots Enabled</span>
                                    <span className={type.enablePlots ? "text-secondary font-medium" : "text-slate-500"}>
                                        {type.enablePlots ? "Yes" : "No"}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};
