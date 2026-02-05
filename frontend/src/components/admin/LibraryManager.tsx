import { useState, useEffect } from 'react';
import axios from 'axios';
import { Folder, File, ChevronRight, ChevronDown, Upload, Trash2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: FileNode[];
    size?: string;
    updatedAt?: string;
}

export const LibraryManager = () => {
    const [structure, setStructure] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [currentPath, setCurrentPath] = useState<string>(''); // For upload context

    useEffect(() => {
        fetchLibrary();
    }, []);

    const fetchLibrary = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/api/library');
            setStructure(response.data.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch library structure", err);
            setLoading(false);
        }
    };

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
    };

    const handleUpload = (folderPath: string) => {
        alert(`Ideally, this opens a file picker to upload to: ${folderPath}`);
    };

    const renderTree = (nodes: FileNode[], depth = 0) => {
        return nodes.map((node) => (
            <div key={node.path} style={{ marginLeft: `${depth * 16}px` }}>
                <div className={`
                    flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                    ${node.type === 'folder' ? 'hover:bg-slate-800' : 'hover:bg-slate-800/50'}
                `}>
                    <span onClick={() => node.type === 'folder' && toggleFolder(node.path)} className="text-slate-400 hover:text-white">
                        {node.type === 'folder' && (
                            expandedFolders[node.path] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        )}
                        {node.type === 'file' && <span className="w-4 h-4" />} {/* Spacer */}
                    </span>

                    <div className="flex items-center gap-2 flex-1" onClick={() => node.type === 'folder' && toggleFolder(node.path)}>
                        {node.type === 'folder' ? <Folder className="w-5 h-5 text-primary" /> : <File className="w-5 h-5 text-slate-400" />}
                        <span className="text-slate-200 text-sm font-medium">{node.name}</span>
                    </div>

                    {node.type === 'folder' && (
                        <button onClick={() => handleUpload(node.path)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-colors" title="Upload File Here">
                            <Upload className="w-4 h-4" />
                        </button>
                    )}
                    {node.type === 'file' && (
                        <span className="text-xs text-slate-600 mr-2">{node.size}</span>
                    )}
                </div>

                {/* Recursive Children */}
                {node.type === 'folder' && expandedFolders[node.path] && node.children && (
                    <div className="border-l border-slate-700/50 ml-2">
                        {renderTree(node.children, depth + 1)}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Content Repository</h1>
                    <p className="text-slate-400">Manage knowledge base, text blocks, and slide templates.</p>
                </div>
                <button onClick={fetchLibrary} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            <div className="bg-surface border border-slate-700 rounded-2xl p-6 min-h-[500px]">
                {loading ? (
                    <div className="text-slate-500 text-center py-20">Loading structure...</div>
                ) : (
                    renderTree(structure)
                )}
            </div>
        </div>
    );
};
