import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { presentationTypes as initialTypes } from "@/data/mockData";
import type { PresentationType, Criteria, Section, CriteriaOption } from "@/data/mockData";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Settings2,
  LayoutList,
  Tag,
  ToggleLeft,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";

// ─── Section Edit Dialog ────────────────────────────────────────────
interface SectionEditDialogProps {
  section: Section;
  criteria: Criteria[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: Section) => void;
  onDelete: () => void;
}

const SectionEditDialog = ({ section, criteria, open, onOpenChange, onSave, onDelete }: SectionEditDialogProps) => {
  const [name, setName] = useState(section.name);
  const [varying, setVarying] = useState(section.varying);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>(section.varyingCriteria || []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    onSave({
      ...section,
      name,
      varying,
      varyingCriteria: varying ? selectedCriteria : undefined,
    });
    onOpenChange(false);
  };

  const toggleCriterion = (id: string) => {
    setSelectedCriteria((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Section</DialogTitle>
          <DialogDescription>Modify the section name, type, and variation criteria.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Section Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Section name" />
          </div>

          {/* Varying Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Varying Section</p>
              <p className="text-xs text-muted-foreground mt-0.5">Content changes based on criteria answers</p>
            </div>
            <Switch checked={varying} onCheckedChange={setVarying} />
          </div>

          {/* Criteria Selection (when varying) */}
          {varying && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Varies by Criteria</Label>
              <p className="text-xs text-muted-foreground">Select which criteria drive this section's variation.</p>
              <div className="space-y-1.5 mt-2">
                {criteria.map((c) => (
                  <label
                    key={c.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors",
                      selectedCriteria.includes(c.id) ? "border-accent bg-accent/5" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox checked={selectedCriteria.includes(c.id)} onCheckedChange={() => toggleCriterion(c.id)} />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                      <Badge variant="outline" className="text-xs capitalize ml-2">
                        {c.type}
                      </Badge>
                    </div>
                  </label>
                ))}
                {criteria.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">No criteria defined yet. Add criteria first.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {!showDeleteConfirm ? (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Confirm?
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete();
                  onOpenChange(false);
                }}
              >
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Criteria Edit Dialog ───────────────────────────────────────────
interface CriteriaEditDialogProps {
  criterion?: Criteria | null; // null = create mode
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (criterion: Criteria) => void;
  onDelete?: () => void;
}

const CriteriaEditDialog = ({ criterion, open, onOpenChange, onSave, onDelete }: CriteriaEditDialogProps) => {
  const isCreate = !criterion;
  const [name, setName] = useState(criterion?.name || "");
  const [type, setType] = useState<"single" | "multiple">(criterion?.type || "single");
  const [options, setOptions] = useState<CriteriaOption[]>(criterion?.options || []);
  const [newOption, setNewOption] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const addOption = () => {
    if (!newOption.trim()) return;
    setOptions([...options, { id: newOption.toLowerCase().replace(/\s/g, "-"), label: newOption.trim() }]);
    setNewOption("");
  };

  const removeOption = (id: string) => {
    setOptions(options.filter((o) => o.id !== id));
  };

  const handleSave = () => {
    const id = criterion?.id || name.toLowerCase().replace(/\s/g, "-");
    onSave({ id, name, type, options });
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addOption();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{isCreate ? "Add Criterion" : "Edit Criterion"}</DialogTitle>
          <DialogDescription>
            {isCreate ? "Define a new criterion with predefined answers." : "Modify criterion settings and answers."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Criterion Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., City, Asset Type" />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Answer Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "single" | "multiple")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Choice</SelectItem>
                <SelectItem value="multiple">Multiple Choice</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {type === "single"
                ? "User picks exactly one answer."
                : "User can select multiple answers. Each generates its own slide set."}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Predefined Answers</Label>
            <div className="flex gap-2">
              <Input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type an answer and press Enter"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={addOption} disabled={!newOption.trim()} className="shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {options.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-40 overflow-auto">
                {options.map((opt) => (
                  <span
                    key={opt.id}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs text-foreground group"
                  >
                    {opt.label}
                    <button onClick={() => removeOption(opt.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                No answers yet. Add predefined answers above, or leave empty for dynamic criteria.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {!isCreate && onDelete && (
            <>
              {!showDeleteConfirm ? (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Confirm?
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onDelete();
                      onOpenChange(false);
                    }}
                  >
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </>
          )}
          {isCreate && <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {isCreate ? "Add Criterion" : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Add Section Dialog ─────────────────────────────────────────────
interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (section: Section) => void;
  nextOrder: number;
}

const AddSectionDialog = ({ open, onOpenChange, onAdd, nextOrder }: AddSectionDialogProps) => {
  const [name, setName] = useState("");

  const handleAdd = () => {
    onAdd({
      id: name.toLowerCase().replace(/\s/g, "-") + "-" + Date.now(),
      name,
      order: nextOrder,
      varying: false,
    });
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Add Section</DialogTitle>
          <DialogDescription>Create a new section for this presentation type.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label className="text-sm font-medium">Section Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Market Overview"
            onKeyDown={(e) => e.key === "Enter" && name.trim() && handleAdd()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>
            Add Section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Builder Page ──────────────────────────────────────────────
const BuilderPage = () => {
  const [types, setTypes] = useState<PresentationType[]>(initialTypes);
  const [expandedType, setExpandedType] = useState<string | null>("feasibility-study");
  const [activeTab, setActiveTab] = useState<"criteria" | "sections">("sections");
  const { toast } = useToast();

  // Dialogs
  const [showCreateTypeDialog, setShowCreateTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  const [editingSection, setEditingSection] = useState<{ typeId: string; section: Section } | null>(null);
  const [addingSectionForType, setAddingSectionForType] = useState<string | null>(null);

  const [editingCriterion, setEditingCriterion] = useState<{ typeId: string; criterion: Criteria | null } | null>(null);

  // ─── Helpers ────────────────────────────────────────────────
  const updateType = (typeId: string, updater: (t: PresentationType) => PresentationType) => {
    setTypes((prev) => prev.map((t) => (t.id === typeId ? updater(t) : t)));
  };

  const toggleExpand = (id: string) => setExpandedType(expandedType === id ? null : id);

  // ─── Type CRUD ──────────────────────────────────────────────
  const handleCreateType = () => {
    if (!newTypeName.trim()) return;
    const newType: PresentationType = {
      id: newTypeName.toLowerCase().replace(/\s/g, "-") + "-" + Date.now(),
      name: newTypeName,
      enablePlots: false,
      criteria: [],
      sections: [],
    };
    setTypes([...types, newType]);
    setNewTypeName("");
    setShowCreateTypeDialog(false);
    setExpandedType(newType.id);
    toast({ title: "Presentation type created", description: `"${newTypeName}" has been added.` });
  };

  const handleTogglePlots = (typeId: string, enabled: boolean) => {
    updateType(typeId, (t) => ({ ...t, enablePlots: enabled }));
  };

  // ─── Section CRUD ───────────────────────────────────────────
  const handleSaveSection = (typeId: string, updated: Section) => {
    updateType(typeId, (t) => ({
      ...t,
      sections: t.sections.map((s) => (s.id === updated.id ? updated : s)),
    }));
    setEditingSection(null);
    toast({ title: "Section updated", description: `"${updated.name}" saved.` });
  };

  const handleDeleteSection = (typeId: string, sectionId: string) => {
    updateType(typeId, (t) => ({
      ...t,
      sections: t.sections
        .filter((s) => s.id !== sectionId)
        .map((s, i) => ({ ...s, order: i + 1 })),
    }));
    toast({ title: "Section deleted" });
  };

  const handleAddSection = (typeId: string, section: Section) => {
    updateType(typeId, (t) => ({ ...t, sections: [...t.sections, section] }));
    toast({ title: "Section added", description: `"${section.name}" added.` });
  };

  // ─── Criteria CRUD ──────────────────────────────────────────
  const handleSaveCriterion = (typeId: string, criterion: Criteria) => {
    const currentType = types.find((t) => t.id === typeId);
    const wasExisting = currentType?.criteria.find((c) => c.id === criterion.id);
    updateType(typeId, (t) => {
      const exists = t.criteria.find((c) => c.id === criterion.id);
      return {
        ...t,
        criteria: exists ? t.criteria.map((c) => (c.id === criterion.id ? criterion : c)) : [...t.criteria, criterion],
      };
    });
    setEditingCriterion(null);
    toast({ title: wasExisting ? "Criterion updated" : "Criterion added", description: `"${criterion.name}" saved.` });
  };

  const handleDeleteCriterion = (typeId: string, criterionId: string) => {
    updateType(typeId, (t) => ({
      ...t,
      criteria: t.criteria.filter((c) => c.id !== criterionId),
      sections: t.sections.map((s) => ({
        ...s,
        varyingCriteria: s.varyingCriteria?.filter((c) => c !== criterionId),
      })),
    }));
    toast({ title: "Criterion deleted" });
  };


  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Presentation Builder"
        description="Create and manage presentation types, criteria, and section structures."
        action={
          <Dialog open={showCreateTypeDialog} onOpenChange={setShowCreateTypeDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" />
                New Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Create New Presentation Type</DialogTitle>
                <DialogDescription>Add a new presentation type to configure criteria and sections.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Presentation Type Name</Label>
                  <Input
                    placeholder="e.g., Credential Report"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && newTypeName.trim() && handleCreateType()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateTypeDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateType} disabled={!newTypeName.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 p-8 space-y-4">
        {types.map((type) => {
          const isExpanded = expandedType === type.id;
          return (
            <Card key={type.id} className="overflow-hidden">
              {/* Type Header */}
              <button
                onClick={() => toggleExpand(type.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{type.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{type.criteria.length} criteria</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{type.sections.length} sections</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {type.enablePlots && (
                    <Badge variant="secondary" className="text-xs">
                      Multi-plot
                    </Badge>
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-border animate-fade-in">
                  {/* Settings Bar */}
                  <div className="flex items-center gap-6 px-5 py-3 bg-muted/30 border-b border-border">
                    <div className="flex items-center gap-2">
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Number of Plots</span>
                      <Switch
                        checked={type.enablePlots}
                        onCheckedChange={(checked) => handleTogglePlots(type.id, checked)}
                      />
                    </div>
                    <Separator orientation="vertical" className="h-5" />
                    <div className="flex gap-1">
                      <Button
                        variant={activeTab === "sections" ? "default" : "ghost"}
                        size="sm"
                        className="gap-1.5 text-xs h-7"
                        onClick={() => setActiveTab("sections")}
                      >
                        <LayoutList className="h-3.5 w-3.5" />
                        Sections
                      </Button>
                      <Button
                        variant={activeTab === "criteria" ? "default" : "ghost"}
                        size="sm"
                        className="gap-1.5 text-xs h-7"
                        onClick={() => setActiveTab("criteria")}
                      >
                        <Tag className="h-3.5 w-3.5" />
                        Criteria
                      </Button>
                    </div>
                  </div>

                  {/* Sections Tab */}
                  {activeTab === "sections" && (
                    <div className="p-5 space-y-2">
                      {type.sections.map((section) => (
                        <div
                          key={section.id}
                          className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors group"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                            {section.order}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-foreground">{section.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {section.varying ? (
                              <Badge className="bg-accent/10 text-accent border-accent/20 text-xs">Varying</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Fixed
                              </Badge>
                            )}
                            {section.varying && section.varyingCriteria && section.varyingCriteria.length > 0 && (
                              <span className="text-xs text-muted-foreground hidden lg:inline">
                                by{" "}
                                {section.varyingCriteria
                                  .map((cId) => type.criteria.find((c) => c.id === cId)?.name || cId)
                                  .join(", ")}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-60 group-hover:opacity-100 transition-opacity"
                              onClick={() => setEditingSection({ typeId: type.id, section })}
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 gap-2 border-dashed"
                        onClick={() => setAddingSectionForType(type.id)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Section
                      </Button>
                    </div>
                  )}

                  {/* Criteria Tab */}
                  {activeTab === "criteria" && (
                    <div className="p-5 space-y-2">
                      {type.criteria.map((criterion) => (
                        <div
                          key={criterion.id}
                          className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors group"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{criterion.name}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {criterion.type}
                              </Badge>
                            </div>
                            {criterion.options.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {criterion.options.slice(0, 6).map((opt) => (
                                  <span
                                    key={opt.id}
                                    className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                  >
                                    {opt.label}
                                  </span>
                                ))}
                                {criterion.options.length > 6 && (
                                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                    +{criterion.options.length - 6} more
                                  </span>
                                )}
                              </div>
                            )}
                            {criterion.options.length === 0 && (
                              <p className="text-xs text-muted-foreground mt-1">Dynamic — depends on other criteria</p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditingCriterion({ typeId: type.id, criterion })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => handleDeleteCriterion(type.id, criterion.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 gap-2 border-dashed"
                        onClick={() => setEditingCriterion({ typeId: type.id, criterion: null })}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Criterion
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Section Edit Dialog */}
      {editingSection && (
        <SectionEditDialog
          key={editingSection.section.id}
          section={editingSection.section}
          criteria={types.find((t) => t.id === editingSection.typeId)?.criteria || []}
          open={true}
          onOpenChange={(open) => !open && setEditingSection(null)}
          onSave={(updated) => handleSaveSection(editingSection.typeId, updated)}
          onDelete={() => handleDeleteSection(editingSection.typeId, editingSection.section.id)}
        />
      )}

      {/* Add Section Dialog */}
      {addingSectionForType && (
        <AddSectionDialog
          open={true}
          onOpenChange={(open) => !open && setAddingSectionForType(null)}
          onAdd={(section) => handleAddSection(addingSectionForType, section)}
          nextOrder={(types.find((t) => t.id === addingSectionForType)?.sections.length || 0) + 1}
        />
      )}

      {/* Criteria Edit/Create Dialog */}
      {editingCriterion && (
        <CriteriaEditDialog
          key={editingCriterion.criterion?.id || "new"}
          criterion={editingCriterion.criterion}
          open={true}
          onOpenChange={(open) => !open && setEditingCriterion(null)}
          onSave={(criterion) => handleSaveCriterion(editingCriterion.typeId, criterion)}
          onDelete={
            editingCriterion.criterion
              ? () => handleDeleteCriterion(editingCriterion.typeId, editingCriterion.criterion!.id)
              : undefined
          }
        />
      )}
    </div>
  );
};

export default BuilderPage;
