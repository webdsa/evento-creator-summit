'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchWithAuth } from '@/lib/admin-api';
import { mapSpreadsheetObjectRow, type PlannedSpreadsheetAction } from '@/lib/spreadsheet-sync';
import { useToast } from '@/hooks/use-toast';

type Props = {
  getIdToken: () => Promise<string | null>;
  labels: {
    button: string;
    title: string;
    hint: string;
    preview: string;
    apply: string;
    applied: string;
    matched: string;
    create: string;
    ambiguous: string;
    skip: string;
    cancel: string;
    error: string;
    missingColumns: string;
    institution: string;
    institutionMissing: string;
  };
  onApplied: () => void;
};

type SyncResponse = {
  summary: { update: number; create: number; ambiguous: number; skip: number };
  actions: PlannedSpreadsheetAction[];
  error?: string;
};

export function SpreadsheetSyncDialog({ getIdToken, labels, onApplied }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [rows, setRows] = useState<ReturnType<typeof mapSpreadsheetObjectRow>[]>([]);
  const [preview, setPreview] = useState<SyncResponse | null>(null);

  const reset = () => {
    setRows([]);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const parseFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) throw new Error('empty');
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const mapped = json.map((raw, index) => mapSpreadsheetObjectRow(raw, index + 2));
    if (!mapped.some((row) => row.influencer)) {
      throw new Error('missing_influencer');
    }
    return mapped;
  };

  const runPreview = async (parsedRows: ReturnType<typeof mapSpreadsheetObjectRow>[]) => {
    const res = await fetchWithAuth(getIdToken, '/api/admin/registrations/sync-spreadsheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun: true, rows: parsedRows }),
    });
    const data = (await res.json()) as SyncResponse;
    if (!res.ok) throw new Error(data.error || 'failed');
    return data;
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    setOpen(true);
    try {
      const parsed = await parseFile(file);
      setRows(parsed);
      setPreview(await runPreview(parsed));
    } catch (err) {
      setOpen(false);
      toast({
        variant: 'destructive',
        title: labels.error,
        description: err instanceof Error && err.message === 'missing_influencer' ? labels.missingColumns : labels.error,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (rows.length === 0) return;
    setApplying(true);
    try {
      const res = await fetchWithAuth(getIdToken, '/api/admin/registrations/sync-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false, rows }),
      });
      const data = (await res.json()) as SyncResponse;
      if (!res.ok) throw new Error(data.error || 'failed');
      toast({ title: labels.applied });
      setOpen(false);
      reset();
      onApplied();
    } catch {
      toast({ variant: 'destructive', title: labels.error });
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button type="button" variant="outline" className="gap-2" onClick={() => inputRef.current?.click()}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {labels.button}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{labels.title}</DialogTitle>
            <DialogDescription>{labels.hint}</DialogDescription>
          </DialogHeader>
          {loading || !preview ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{labels.preview}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div className="rounded-md border p-2">
                  <div className="font-medium">{preview.summary.update}</div>
                  <div className="text-muted-foreground">{labels.matched}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="font-medium">{preview.summary.create}</div>
                  <div className="text-muted-foreground">{labels.create}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="font-medium">{preview.summary.ambiguous}</div>
                  <div className="text-muted-foreground">{labels.ambiguous}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="font-medium">{preview.summary.skip}</div>
                  <div className="text-muted-foreground">{labels.skip}</div>
                </div>
              </div>
              <div className="max-h-72 overflow-auto rounded-md border text-sm">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">#</th>
                      <th className="text-left p-2">Influencer</th>
                      <th className="text-left p-2">Ação</th>
                      <th className="text-left p-2">Sistema</th>
                      <th className="text-left p-2">{labels.institution}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.actions.map((action) => (
                      <tr key={`${action.kind}-${action.rowNumber}`} className="border-t">
                        <td className="p-2 align-top">{action.rowNumber}</td>
                        <td className="p-2 align-top">{action.influencer || '—'}</td>
                        <td className="p-2 align-top">
                          {action.kind === 'update'
                            ? labels.matched
                            : action.kind === 'create'
                              ? labels.create
                              : action.kind === 'ambiguous'
                                ? labels.ambiguous
                                : labels.skip}
                        </td>
                        <td className="p-2 align-top text-muted-foreground">
                          {action.kind === 'update'
                            ? action.fullName
                            : action.kind === 'ambiguous'
                              ? action.candidates.map((c) => c.full_name).join(' / ')
                              : action.kind === 'skip'
                                ? action.reason
                                : '—'}
                        </td>
                        <td className="p-2 align-top text-muted-foreground">
                          {action.kind === 'update' || action.kind === 'create'
                            ? action.institutionStatus === 'matched'
                              ? action.institutionName
                              : action.institutionStatus === 'unmatched'
                                ? `${labels.institutionMissing}: ${action.uniao}`
                                : '—'
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {labels.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={applying || loading || !preview || preview.summary.update + preview.summary.create === 0}
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {labels.apply}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
