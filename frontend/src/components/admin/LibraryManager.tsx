import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { apiUrl } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
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
    const { toast } = useToast();
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
            await axios.post(apiUrl('library/scan'));
            const response = await axios.get(apiUrl('library/structure'));
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
            await axios.post(apiUrl('upload'), formData);
            await fetchLibrary(); // Refresh
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || "Upload failed.";
            toast({ title: "Upload failed", description: msg, variant: "destructive" });
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
                        group flex items-center gap-3 py-2 pr-4 cursor-pointer transition-all duration-200
                        ${node.type === 'folder' ? 'hover:bg-muted/80 text-foreground' : 'hover:bg-muted/40 text-muted-foreground'}
                        border-b border-border
                    `}
                    style={{ paddingLeft: `${paddingLeft}px` }}
                    onClick={() => node.type === 'folder' && toggleFolder(node.path)}
                >
                    <div className="flex items-center justify-center w-5 h-5 text-slate-500">
                        {node.type === 'folder' && (
                            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                        )}
                    </div>

                    <div className="p-1.5 rounded-lg bg-muted border border-border">
                        {node.type === 'folder' ? <Folder className="w-4 h-4 text-primary" /> : <File className="w-4 h-4 text-muted-foreground" />}
                    </div>

                    <span className={`flex-1 text-sm ${node.type === 'folder' ? 'font-medium' : 'font-normal'}`}>
                        {node.name}
                    </span>

                    {node.type === 'file' && (
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {node.size}
                        </span>
                    )}

                    {node.type === 'folder' && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); triggerUpload(node.path); }}
                                className="p-1.5 hover:bg-primary/20 text-muted-foreground hover:text-primary rounded-lg transition-colors"
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
                    <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                            <HardDrive className="w-5 h-5 text-primary" />
                        </div>
                        Content Library
                    </h2>
                    <p className="text-muted-foreground">Manage your presentation templates and assets.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => triggerUpload('')}
                        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-all active:scale-95"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Upload to Root</span>
                    </button>
                    <button
                        onClick={fetchLibrary}
                        className="p-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl border border-border transition-colors"
                        title="Refresh Library"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-muted/50 border-b border-border flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <Folder className="w-4 h-4" />
                    Library Structure
                </div>

                {loading && structure.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                        <RefreshCw className="w-8 h-8 animate-spin mb-4 text-primary" />
                        <p>Scanning library contents...</p>
                    </div>
                ) : (
                    <div className="min-h-[400px] overflow-auto">
                        {structure.length > 0 ? (
                            structure.map((node) => (
                                <FileTreeItem key={node.path} node={node} />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                                <Folder className="w-12 h-12 mb-4 opacity-20" />
                                <p>Library is empty. Run scan or upload files.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
