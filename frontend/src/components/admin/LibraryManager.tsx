import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Folder, File, ChevronRight, ChevronDown, Upload, RefreshCw, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadTarget, setUploadTarget] = useState<string>('');

    useEffect(() => {
        fetchLibrary();
    }, []);

    const fetchLibrary = async () => {
        try {
            setLoading(true);
            await axios.post('http://localhost:5000/api/library/scan');
            const response = await axios.get('http://localhost:5000/api/library/structure');
            const cleanStructure = response.data.data.filter((node: FileNode) => node.name !== 'RootTemplate.pptx');
            setStructure(cleanStructure);
        } catch (err) {
            console.error("Failed to fetch library structure", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
    };

    const triggerUpload = (folderPath: string) => {
        setUploadTarget(folderPath);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        formData.append('file', files[0]);
        // Construct upload path. If uploadTarget is root (empty string), it goes to Library root.
        // Otherwise it goes to the specific folder.
        // Note: The backend expects 'destinationPath' which is relative to Library root.
        // The 'path' in node structure is usually just the name for top level, or relative path.
        // We need to ensure we are sending the correct relative path string.
        formData.append('destinationPath', uploadTarget);

        try {
            await axios.post('http://localhost:5000/api/upload', formData);
            await fetchLibrary(); // Refresh
        } catch (err) {
            console.error(err);
            alert("Upload failed.");
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploadTarget('');
    };

    const FileTreeItem = ({ node, depth = 0 }: { node: FileNode, depth?: number }) => {
        const isExpanded = expandedFolders[node.path];
        const paddingLeft = depth * 20 + 12;

        return (
            <div className="select-none">
                <div
                    className={`
                        flex items-center gap-3 py-2 pr-4 cursor-pointer transition-all duration-200
                        ${node.type === 'folder' ? 'hover:bg-slate-800/80 text-slate-200' : 'hover:bg-slate-800/40 text-slate-400'}
                        border-b border-slate-800/30
                    `}
                    style={{ paddingLeft: `${paddingLeft}px` }}
                    onClick={() => node.type === 'folder' && toggleFolder(node.path)}
                >
                    <div className="flex items-center justify-center w-5 h-5 text-slate-500">
                        {node.type === 'folder' && (
                            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        )}
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        {node.type === 'folder' ? <Folder className="w-4 h-4 text-indigo-400" /> : <File className="w-4 h-4 text-slate-500" />}
                    </div>

                    <span className={`flex-1 text-sm ${node.type === 'folder' ? 'font-medium' : 'font-normal'}`}>
                        {node.name}
                    </span>

                    {node.type === 'file' && (
                        <span className="text-xs font-mono text-slate-600 bg-slate-900 px-2 py-0.5 rounded">
                            {node.size}
                        </span>
                    )}

                    {node.type === 'folder' && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); triggerUpload(node.path); }}
                                className="p-1.5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors"
                                title="Upload File Here"
                            >
                                <Upload className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {isExpanded && node.children && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            {node.children.map((child) => (
                                <FileTreeItem key={child.path} node={child} depth={depth + 1} />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pptx"
                onChange={handleFileChange}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <HardDrive className="w-6 h-6 text-indigo-400" />
                        </div>
                        Content Library
                    </h1>
                    <p className="text-slate-400 text-lg">Manage your presentation templates and assets.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => triggerUpload('')}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Upload to Root</span>
                    </button>
                    <button
                        onClick={fetchLibrary}
                        className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
                        title="Refresh Library"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="bg-surface/50 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
                <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-700/50 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Folder className="w-4 h-4" />
                    Library Structure
                </div>

                {loading && structure.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-500">
                        <RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                        <p>Scanning library contents...</p>
                    </div>
                ) : (
                    <div className="min-h-[500px] overflow-auto">
                        {structure.length > 0 ? (
                            structure.map((node) => (
                                <FileTreeItem key={node.path} node={node} />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 text-slate-500">
                                <Folder className="w-12 h-12 mb-4 opacity-20" />
                                <p>Library is empty</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
