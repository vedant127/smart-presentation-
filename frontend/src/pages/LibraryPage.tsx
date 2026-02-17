import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { libraryStructure } from "@/data/mockData";
import type { LibraryFolder, LibraryFile } from "@/data/mockData";
import {
  Folder,
  FolderOpen,
  FileText,
  Upload,
  Trash2,
  Download,
  Search,
  ChevronRight,
  ArrowLeft,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LibraryPage = () => {
  const [currentPath, setCurrentPath] = useState<string[]>(["Library"]);
  const [searchQuery, setSearchQuery] = useState("");

  const navigateToFolder = (folderName: string) => {
    setCurrentPath([...currentPath, folderName]);
  };

  const navigateUp = () => {
    if (currentPath.length > 1) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  const navigateToIndex = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };

  // Find current folder based on path
  const findFolder = (root: LibraryFolder, path: string[]): LibraryFolder | null => {
    if (path.length <= 1) return root;
    let current: LibraryFolder | undefined = root;
    for (let i = 1; i < path.length; i++) {
      current = current?.children?.find((c) => c.name === path[i]);
      if (!current) return null;
    }
    return current || null;
  };

  const currentFolder = findFolder(libraryStructure, currentPath);
  const subfolders = currentFolder?.children || [];
  const files = currentFolder?.files || [];

  const filteredFiles = searchQuery
    ? files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  const filteredFolders = searchQuery
    ? subfolders.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : subfolders;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Library"
        description="Browse and manage your PPTX slide library organized by presentation type and section."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90" size="sm">
              <Upload className="h-3.5 w-3.5" />
              Upload
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-8">
        {/* Breadcrumb + Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1">
            {currentPath.length > 1 && (
              <Button variant="ghost" size="sm" onClick={navigateUp} className="h-8 w-8 p-0 mr-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {currentPath.map((segment, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mx-1" />}
                <button
                  onClick={() => navigateToIndex(index)}
                  className={cn(
                    "text-sm px-1.5 py-0.5 rounded hover:bg-muted transition-colors",
                    index === currentPath.length - 1
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {segment}
                </button>
              </div>
            ))}
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
        </div>

        {/* Content */}
        <Card className="overflow-hidden">
          {/* Folders */}
          {filteredFolders.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-muted/30 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Folders</span>
              </div>
              {filteredFolders.map((folder, index) => (
                <button
                  key={folder.id}
                  onClick={() => navigateToFolder(folder.name)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left",
                    index < filteredFolders.length - 1 && "border-b border-border/50"
                  )}
                >
                  <Folder className="h-4.5 w-4.5 text-accent" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{folder.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {folder.children?.length || 0} folders, {folder.files?.length || 0} files
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {/* Files */}
          {filteredFiles.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-muted/30 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Files</span>
              </div>
              {filteredFiles.map((file, index) => (
                <div
                  key={file.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors",
                    index < filteredFiles.length - 1 && "border-b border-border/50"
                  )}
                >
                  <FileText className="h-4.5 w-4.5 text-info" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{file.size}</span>
                      <span className="text-xs text-muted-foreground">{file.modified}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredFolders.length === 0 && filteredFiles.length === 0 && (
            <div className="py-16 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No files match your search" : "This folder is empty"}
              </p>
              <Button variant="outline" size="sm" className="mt-4 gap-2">
                <Upload className="h-3.5 w-3.5" />
                Upload Files
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LibraryPage;
