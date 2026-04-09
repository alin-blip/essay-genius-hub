import DashboardLayout from "@/components/DashboardLayout";
import { useEffect, useState, useMemo } from "react";
import { Tables } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FolderPlus, Folder, FolderOpen, FileText, Search, Trash2,
  ChevronRight, MoreVertical, Pencil, ArrowLeft, Plus,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type FolderRow = {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  generating: "bg-accent/20 text-accent-foreground",
  completed: "bg-green-100 text-green-800",
};

const GRADE_LABELS: Record<string, string> = {
  pass: "Pass",
  merit: "Merit",
  distinction_lower: "2:1",
  distinction: "First",
};

const FOLDER_COLORS = [
  { label: "Blue", value: "hsl(215, 60%, 23%)" },
  { label: "Gold", value: "hsl(40, 55%, 55%)" },
  { label: "Green", value: "hsl(142, 50%, 40%)" },
  { label: "Red", value: "hsl(0, 70%, 55%)" },
  { label: "Purple", value: "hsl(270, 50%, 50%)" },
];

export default function AssignmentsLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [assignments, setAssignments] = useState<Tables<"assignments">[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Folder CRUD state
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderRow | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState(FOLDER_COLORS[0].value);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ type: "folder" | "assignment"; id: string; name: string } | null>(null);

  // Move assignment state
  const [movingAssignment, setMovingAssignment] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [foldersRes, assignmentsRes] = await Promise.all([
      supabase.from("folders" as any).select("*").eq("user_id", user!.id).order("name"),
      supabase.from("assignments").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    ]);
    if (foldersRes.data) setFolders(foldersRes.data as any as FolderRow[]);
    if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    setLoading(false);
  };

  // Breadcrumb path
  const breadcrumbPath = useMemo(() => {
    const path: FolderRow[] = [];
    let id = currentFolderId;
    while (id) {
      const f = folders.find((f) => f.id === id);
      if (f) { path.unshift(f); id = f.parent_id; } else break;
    }
    return path;
  }, [currentFolderId, folders]);

  // Filtered items in current folder
  const currentFolders = useMemo(() =>
    folders.filter((f) => f.parent_id === currentFolderId && f.name.toLowerCase().includes(search.toLowerCase())),
    [folders, currentFolderId, search]
  );

  const currentAssignments = useMemo(() =>
    assignments.filter((a) => {
      const inFolder = (a as any).folder_id === currentFolderId;
      const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase());
      return inFolder && matchesSearch;
    }),
    [assignments, currentFolderId, search]
  );

  // Folder CRUD
  const handleSaveFolder = async () => {
    if (!folderName.trim() || !user) return;
    if (editingFolder) {
      const { error } = await supabase.from("folders" as any).update({ name: folderName, color: folderColor } as any).eq("id", editingFolder.id);
      if (error) { toast.error("Failed to update folder"); return; }
      toast.success("Folder updated");
    } else {
      const { error } = await supabase.from("folders" as any).insert({ name: folderName, color: folderColor, user_id: user.id, parent_id: currentFolderId } as any);
      if (error) { toast.error("Failed to create folder"); return; }
      toast.success("Folder created");
    }
    setShowFolderDialog(false);
    setEditingFolder(null);
    setFolderName("");
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "folder") {
      // Move assignments out of folder first
      await (supabase.from("assignments") as any).update({ folder_id: null }).eq("folder_id", deleteTarget.id);
      const { error } = await supabase.from("folders" as any).delete().eq("id", deleteTarget.id);
      if (error) { toast.error("Failed to delete folder"); } else { toast.success("Folder deleted"); }
    } else {
      const { error } = await supabase.from("assignments").delete().eq("id", deleteTarget.id);
      if (error) { toast.error("Failed to delete assignment"); } else { toast.success("Assignment deleted"); }
    }
    setDeleteTarget(null);
    fetchData();
  };

  const handleMoveAssignment = async (assignmentId: string, folderId: string | null) => {
    const { error } = await (supabase.from("assignments") as any).update({ folder_id: folderId }).eq("id", assignmentId);
    if (error) { toast.error("Failed to move assignment"); return; }
    toast.success("Assignment moved");
    setMovingAssignment(null);
    fetchData();
  };

  const openCreateFolder = () => {
    setEditingFolder(null);
    setFolderName("");
    setFolderColor(FOLDER_COLORS[0].value);
    setShowFolderDialog(true);
  };

  const openEditFolder = (f: FolderRow) => {
    setEditingFolder(f);
    setFolderName(f.name);
    setFolderColor(f.color || FOLDER_COLORS[0].value);
    setShowFolderDialog(true);
  };

  const assignmentCountInFolder = (folderId: string) =>
    assignments.filter((a) => (a as any).folder_id === folderId).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assignments Library</h1>
            <p className="text-sm text-muted-foreground">Organise your assignments into folders by module, subject, or student.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openCreateFolder}>
              <FolderPlus className="h-4 w-4 mr-1" /> New Folder
            </Button>
            <Button size="sm" onClick={() => navigate("/new-assignment")}>
              <Plus className="h-4 w-4 mr-1" /> New Assignment
            </Button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm">
          <button onClick={() => setCurrentFolderId(null)} className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            All
          </button>
          {breadcrumbPath.map((f) => (
            <span key={f.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <button onClick={() => setCurrentFolderId(f.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                {f.name}
              </button>
            </span>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Back button */}
        {currentFolderId && (
          <Button variant="ghost" size="sm" onClick={() => {
            const parent = folders.find((f) => f.id === currentFolderId)?.parent_id ?? null;
            setCurrentFolderId(parent);
          }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}

        {/* Folders grid */}
        {currentFolders.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {currentFolders.map((f) => (
              <Card
                key={f.id}
                className="cursor-pointer hover:shadow-md transition-shadow group relative"
                onClick={() => setCurrentFolderId(f.id)}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <FolderOpen className="h-10 w-10" style={{ color: f.color || "hsl(var(--primary))" }} />
                  <span className="text-sm font-medium text-foreground text-center truncate w-full">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{assignmentCountInFolder(f.id)} items</span>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => openEditFolder(f)}>
                          <Pencil className="h-4 w-4 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ type: "folder", id: f.id, name: f.name })}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Assignments table */}
        {currentAssignments.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Grade</TableHead>
                  <TableHead className="hidden sm:table-cell">Words</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAssignments.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/assignment/${a.id}`)}>
                    <TableCell className="font-medium max-w-[200px] truncate">{a.title}</TableCell>
                    <TableCell className="hidden md:table-cell capitalize">{a.assignment_type}</TableCell>
                    <TableCell className="hidden sm:table-cell">{GRADE_LABELS[a.target_grade] || a.target_grade}</TableCell>
                    <TableCell className="hidden sm:table-cell">{a.word_count.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[a.status] || ""}>{a.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {new Date(a.created_at).toLocaleDateString("en-GB")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setMovingAssignment(a.id)}>
                            <Folder className="h-4 w-4 mr-2" /> Move to folder
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget({ type: "assignment", id: a.id, name: a.title })}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : currentFolders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {currentFolderId ? "This folder is empty." : "No assignments yet. Create your first one!"}
              </p>
              <Button className="mt-4" onClick={() => navigate("/new-assignment")}>
                <Plus className="h-4 w-4 mr-1" /> New Assignment
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Create/Edit Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFolder ? "Rename Folder" : "New Folder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input placeholder="Folder name" value={folderName} onChange={(e) => setFolderName(e.target.value)} autoFocus />
            <div className="flex gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.value}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${folderColor === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setFolderColor(c.value)}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveFolder} disabled={!folderName.trim()}>
              {editingFolder ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Assignment Dialog */}
      <Dialog open={!!movingAssignment} onOpenChange={() => setMovingAssignment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <button
              className="w-full text-left px-3 py-2 rounded-md hover:bg-muted flex items-center gap-2 text-sm"
              onClick={() => handleMoveAssignment(movingAssignment!, null)}
            >
              <FileText className="h-4 w-4 text-muted-foreground" /> No folder (root)
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted flex items-center gap-2 text-sm"
                onClick={() => handleMoveAssignment(movingAssignment!, f.id)}
              >
                <Folder className="h-4 w-4" style={{ color: f.color || "hsl(var(--primary))" }} />
                {f.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "folder"
                ? `"${deleteTarget.name}" will be deleted. Assignments inside will be moved to the root.`
                : `"${deleteTarget?.name}" will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
