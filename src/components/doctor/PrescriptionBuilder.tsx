import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { generatePrescriptionPdf } from "@/lib/generatePrescriptionPdf";
import {
  Plus, Trash2, FileDown, PenTool, Search, GripVertical, Pill
} from "lucide-react";

interface PrescriptionItem {
  medicine_name: string;
  generic_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  doctorId: string;
  doctorName: string;
  specialization?: string;
}

const FREQUENCIES = [
  "Once daily",
  "Twice daily",
  "Thrice daily",
  "Four times daily",
  "Every 6 hours",
  "Every 8 hours",
  "Every 12 hours",
  "Before meals",
  "After meals",
  "At bedtime",
  "As needed (SOS)",
  "Weekly",
];

const DURATIONS = [
  "3 days", "5 days", "7 days", "10 days", "14 days",
  "21 days", "1 month", "2 months", "3 months", "6 months",
  "Until follow-up", "Ongoing",
];

const emptyItem = (): PrescriptionItem => ({
  medicine_name: "",
  generic_name: "",
  dosage: "",
  frequency: "Twice daily",
  duration: "5 days",
  instructions: "",
});

export default function PrescriptionBuilder({
  open, onOpenChange, appointment, doctorId, doctorName, specialization
}: Props) {
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PrescriptionItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [signatureData, setSignatureData] = useState<string>("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [medicineResults, setMedicineResults] = useState<any[]>([]);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // Medicine search from database
  const searchMedicines = useCallback(async (query: string) => {
    if (query.length < 2) { setMedicineResults([]); return; }
    const { data } = await supabase
      .from("medicines")
      .select("name, generic_name, unit")
      .ilike("name", `%${query}%`)
      .limit(8);
    setMedicineResults(data || []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (medicineSearch.length >= 2) searchMedicines(medicineSearch);
      else setMedicineResults([]);
    }, 300);
    return () => clearTimeout(t);
  }, [medicineSearch, searchMedicines]);

  const updateItem = (idx: number, field: keyof PrescriptionItem, value: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const selectMedicine = (idx: number, med: any) => {
    updateItem(idx, "medicine_name", med.name);
    updateItem(idx, "generic_name", med.generic_name || "");
    setMedicineResults([]);
    setActiveSearchIdx(null);
    setMedicineSearch("");
  };

  // Signature pad handlers
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx?.beginPath();
    ctx?.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx?.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx?.stroke();
  };

  const endDraw = () => {
    isDrawing.current = false;
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureData(canvas.toDataURL("image/png"));
    setShowSignaturePad(false);
  };

  const clearSignature = () => {
    setSignatureData("");
    initCanvas();
  };

  const handleSave = async () => {
    const validItems = items.filter(it => it.medicine_name.trim() && it.dosage.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one medicine with dosage");
      return;
    }
    setSaving(true);

    try {
      const { data: rx, error: rxErr } = await supabase
        .from("prescriptions")
        .insert({
          appointment_id: appointment.id,
          doctor_id: doctorId,
          patient_id: appointment.patient_id,
          diagnosis: diagnosis || null,
          notes: notes || null,
          signature_data: signatureData || null,
        } as any)
        .select("id")
        .single();

      if (rxErr) throw rxErr;

      const itemsData = validItems.map((it, idx) => ({
        prescription_id: rx.id,
        medicine_name: it.medicine_name,
        generic_name: it.generic_name || null,
        dosage: it.dosage,
        frequency: it.frequency,
        duration: it.duration,
        instructions: it.instructions || null,
        sort_order: idx,
      }));

      const { error: itemsErr } = await supabase
        .from("prescription_items")
        .insert(itemsData as any);

      if (itemsErr) throw itemsErr;

      logAuditAction({
        action: "create_prescription",
        entityType: "prescription",
        entityId: rx.id,
        details: { appointment_id: appointment.id, items_count: validItems.length },
      });

      toast.success("Prescription saved successfully");
      onOpenChange(false);

      // Reset
      setDiagnosis("");
      setNotes("");
      setItems([emptyItem()]);
      setSignatureData("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save prescription");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    const validItems = items.filter(it => it.medicine_name.trim() && it.dosage.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one medicine");
      return;
    }
    generatePrescriptionPdf({
      doctorName,
      specialization,
      patientId: appointment.patient_id,
      diagnosis,
      notes,
      items: validItems,
      signatureData,
      date: appointment.appointment_date,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            Prescription Builder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Diagnosis */}
          <div>
            <Label className="text-sm font-medium">Diagnosis</Label>
            <Input
              placeholder="e.g., Acute Upper Respiratory Infection"
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
            />
          </div>

          {/* Medicines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Medicines</Label>
              <Button size="sm" variant="outline" onClick={() => setItems(prev => [...prev, emptyItem()])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Medicine
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <Card key={idx} className="p-3 relative">
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 mt-2.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      {/* Medicine name with search */}
                      <div className="relative">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Search medicine..."
                              className="pl-8"
                              value={activeSearchIdx === idx ? medicineSearch : item.medicine_name}
                              onFocus={() => { setActiveSearchIdx(idx); setMedicineSearch(item.medicine_name); }}
                              onChange={e => {
                                setMedicineSearch(e.target.value);
                                updateItem(idx, "medicine_name", e.target.value);
                              }}
                              onBlur={() => setTimeout(() => setActiveSearchIdx(null), 200)}
                            />
                            {activeSearchIdx === idx && medicineResults.length > 0 && (
                              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                {medicineResults.map((med, mi) => (
                                  <button
                                    key={mi}
                                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between"
                                    onMouseDown={() => selectMedicine(idx, med)}
                                  >
                                    <span className="font-medium">{med.name}</span>
                                    {med.generic_name && (
                                      <span className="text-muted-foreground text-xs">{med.generic_name}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <Input
                            placeholder="Generic name"
                            className="w-36"
                            value={item.generic_name}
                            onChange={e => updateItem(idx, "generic_name", e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Dosage, Frequency, Duration */}
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Dosage (e.g., 500mg)"
                          value={item.dosage}
                          onChange={e => updateItem(idx, "dosage", e.target.value)}
                        />
                        <Select value={item.frequency} onValueChange={v => updateItem(idx, "frequency", v)}>
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={item.duration} onValueChange={v => updateItem(idx, "duration", v)}>
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Instructions */}
                      <Input
                        placeholder="Special instructions (e.g., Take with food)"
                        value={item.instructions}
                        onChange={e => updateItem(idx, "instructions", e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="mt-1 flex-shrink-0"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium">Additional Notes</Label>
            <Textarea
              placeholder="Advice, follow-up instructions..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* E-Signature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5" /> E-Signature
              </Label>
              {signatureData ? (
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">Signed ✓</Badge>
                  <Button size="sm" variant="ghost" onClick={clearSignature}>Clear</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => { setShowSignaturePad(true); setTimeout(initCanvas, 100); }}>
                  Add Signature
                </Button>
              )}
            </div>
            {signatureData && (
              <div className="border rounded-lg p-2 bg-muted/30 inline-block">
                <img src={signatureData} alt="Signature" className="h-12" />
              </div>
            )}
            {showSignaturePad && (
              <Card className="p-3 space-y-2">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={120}
                  className="border rounded cursor-crosshair bg-white w-full"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => { clearSignature(); setShowSignaturePad(false); }}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="outline" onClick={initCanvas}>Clear Pad</Button>
                  <Button size="sm" onClick={saveSignature}>Save Signature</Button>
                </div>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDownloadPdf} className="flex-1">
            <FileDown className="w-4 h-4 mr-1" /> Download PDF
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Prescription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
