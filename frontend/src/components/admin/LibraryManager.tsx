import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Folder, File, ChevronRight, ChevronDown, Upload, Trash2, RefreshCw, Plus } from 'lucide-react';

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
            // 1. Scan first to ensure DB is up to date
            await axios.post('http://localhost:5000/api/library/scan');
            // 2. Fetch structure
            const response = await axios.get('http://localhost:5000/api/library/structure');
            // Filter out RootTemplate.pptx from view
            const cleanStructure = response.data.data.filter((node: FileNode) => node.name !== 'RootTemplate.pptx');
            setStructure(cleanStructure);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch library structure", err);
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
        // The backend expects 'destinationPath' relative to Library root. 
        // Our 'folderPath' from structure is already relative (e.g., "Mumbai").
        formData.append('destinationPath', uploadTarget);

        try {
            await axios.post('http://localhost:5000/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Upload successful!");
            fetchLibrary(); // Refresh
        } catch (err) {
            console.error(err);
            alert("Upload failed.");
        }

        // Reset
        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploadTarget('');
    };

    const renderTree = (nodes: FileNode[], depth = 0) => {
        return nodes.map((node) => (
            <div key={node.path} style={{ marginLeft: `${depth * 16}px` }}>
                <div className={`
                    flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group
                    ${node.type === 'folder' ? 'hover:bg-slate-800' : 'hover:bg-slate-800/50'}
                `}>
                    <span onClick={() => node.type === 'folder' && toggleFolder(node.path)} className="text-slate-400 hover:text-white">
                        {node.type === 'folder' && (
                            expandedFolders[node.path] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        )}
                        {node.type === 'file' && <span className="w-4 h-4" />}
                    </span>

                    <div className="flex items-center gap-2 flex-1" onClick={() => node.type === 'folder' && toggleFolder(node.path)}>
                        {node.type === 'folder' ? <Folder className="w-5 h-5 text-primary" /> : <File className="w-5 h-5 text-slate-400" />}
                        <span className="text-slate-200 text-sm font-medium">{node.name}</span>
                    </div>

                    {node.type === 'folder' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); triggerUpload(node.path); }}
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Upload File Here"
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                    )}
                    {node.type === 'file' && (
                        <span className="text-xs text-slate-600 mr-2">{node.size}</span>
                    )}
                </div>

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
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pptx"
                onChange={handleFileChange}
            />

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Content Repository</h1>
                    <p className="text-slate-400">Manage knowledge base, text blocks, and slide templates.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => triggerUpload('')} className="p-2 bg-primary hover:bg-indigo-600 rounded-lg text-white transition-colors flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Upload to Root
                    </button>
                    <button onClick={fetchLibrary} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
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
