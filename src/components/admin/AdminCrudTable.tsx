import { useState } from "react";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export interface ColumnDef {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean" | "json";
  editable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface AdminCrudTableProps {
  title: string;
  data: any[];
  columns: ColumnDef[];
  onAdd: (item: Record<string, any>) => Promise<void>;
  onUpdate: (id: string, item: Record<string, any>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
  canAdd?: boolean;
}

export default function AdminCrudTable({
  title, data, columns, onAdd, onUpdate, onDelete, loading, canAdd = true,
}: AdminCrudTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const editableColumns = columns.filter((c) => c.editable !== false && c.key !== "id" && c.key !== "created_at");

  const openAdd = () => {
    setEditId(null);
    setFormData({});
    setShowForm(true);
  };

  const openEdit = (row: any) => {
    setEditId(row.id);
    const fd: Record<string, any> = {};
    editableColumns.forEach((c) => {
      fd[c.key] = c.type === "json" ? JSON.stringify(row[c.key] ?? {}) : row[c.key] ?? "";
    });
    setFormData(fd);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const processed: Record<string, any> = {};
      editableColumns.forEach((c) => {
        const val = formData[c.key];
        if (c.type === "number") processed[c.key] = val === "" ? null : Number(val);
        else if (c.type === "boolean") processed[c.key] = val === "true" || val === true;
        else if (c.type === "json") {
          try { processed[c.key] = JSON.parse(val); } catch { processed[c.key] = val; }
        } else processed[c.key] = val;
      });

      if (editId) {
        await onUpdate(editId, processed);
        toast.success("Updated successfully");
      } else {
        await onAdd(processed);
        toast.success("Added successfully");
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await onDelete(id);
      toast.success("Deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {canAdd && (
          <Button onClick={openAdd} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Add New
          </Button>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No records found</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key} className="text-xs font-semibold">{col.label}</TableHead>
                  ))}
                  <TableHead className="text-xs font-semibold w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className="text-sm max-w-[200px] truncate">
                        {col.render
                          ? col.render(row[col.key], row)
                          : col.type === "boolean"
                          ? row[col.key] ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-muted-foreground" />
                          : String(row[col.key] ?? "—")}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(row.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Add"} {title.replace(/s$/, "")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {editableColumns.map((col) => (
              <div key={col.key}>
                <label className="text-sm font-medium text-foreground mb-1 block">{col.label}</label>
                {col.type === "boolean" ? (
                  <select
                    value={String(formData[col.key] ?? "false")}
                    onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                    className="w-full h-10 rounded-md border border-input px-3 text-sm bg-background"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <Input
                    type={col.type === "number" ? "number" : "text"}
                    value={formData[col.key] ?? ""}
                    onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                    placeholder={col.label}
                  />
                )}
              </div>
            ))}
            <Button onClick={handleSave} className="w-full mt-4">
              {editId ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
