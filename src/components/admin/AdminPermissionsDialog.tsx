import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_ADMIN_PAGES } from "@/hooks/useAdminPermissions";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  member: { id: string; name: string; designation: string } | null;
  onClose: () => void;
}

export default function AdminPermissionsDialog({ member, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!member) return;
    setLoading(true);
    supabase
      .from("admin_permissions")
      .select("page_path")
      .eq("admin_team_id", member.id)
      .then(({ data }) => {
        setSelected(new Set((data || []).map((d: any) => d.page_path)));
        setLoading(false);
      });
  }, [member]);

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(ALL_ADMIN_PAGES.map((p) => p.path)));
  const clearAll = () => setSelected(new Set());

  const toggleGroup = (group: string) => {
    const groupPaths = ALL_ADMIN_PAGES.filter((p) => p.group === group).map((p) => p.path);
    const allSelected = groupPaths.every((p) => selected.has(p));
    setSelected((prev) => {
      const next = new Set(prev);
      groupPaths.forEach((p) => allSelected ? next.delete(p) : next.add(p));
      return next;
    });
  };

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);

    // Delete existing
    await supabase.from("admin_permissions").delete().eq("admin_team_id", member.id);

    // Insert new
    if (selected.size > 0) {
      const rows = Array.from(selected).map((page_path) => ({
        admin_team_id: member.id,
        page_path,
      }));
      const { error } = await supabase.from("admin_permissions").insert(rows);
      if (error) {
        toast.error("Failed to save permissions");
        setSaving(false);
        return;
      }
    }

    toast.success(`Permissions updated for ${member.name}`);
    setSaving(false);
    onClose();
  };

  const groups = [...new Set(ALL_ADMIN_PAGES.map((p) => p.group))];

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Assign Permissions
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select pages <span className="font-medium text-foreground">{member?.name}</span> can access
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
              <Button variant="outline" size="sm" onClick={clearAll}>Clear All</Button>
            </div>

            {groups.map((group) => {
              const groupPages = ALL_ADMIN_PAGES.filter((p) => p.group === group);
              const allGroupSelected = groupPages.every((p) => selected.has(p.path));
              const someGroupSelected = groupPages.some((p) => selected.has(p.path));

              return (
                <div key={group} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allGroupSelected}
                      // Use indeterminate-like styling via data attribute
                      className={someGroupSelected && !allGroupSelected ? "opacity-70" : ""}
                      onCheckedChange={() => toggleGroup(group)}
                    />
                    <Label className="font-semibold text-sm cursor-pointer" onClick={() => toggleGroup(group)}>
                      {group}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      ({groupPages.filter((p) => selected.has(p.path)).length}/{groupPages.length})
                    </span>
                  </div>
                  <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {groupPages.map((page) => (
                      <label
                        key={page.path}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selected.has(page.path)}
                          onCheckedChange={() => toggle(page.path)}
                        />
                        <span className="text-sm">{page.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Permissions ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
