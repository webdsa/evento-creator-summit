'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface Speaker {
  id: string;
  name: string;
  biography: string;
  photo: string;
  created_at: string;
  updated_at: string;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

type WorkshopType = 'workshop' | 'plenaria';

interface Workshop {
  id: string;
  title: string;
  description: string;
  type: WorkshopType;
  speaker_ids: string[];
  speaker_names?: string;
  room_id: string;
  room_name?: string;
  title_es?: string;
  description_es?: string;
  created_at: string;
  updated_at: string;
}

export default function WorkshopsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, getIdToken } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'workshop' | 'plenaria'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'workshop' as WorkshopType,
    speaker_ids: [] as string[],
    room_id: '',
    title_es: '',
    description_es: '',
  });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workshopsRes, speakersRes, roomsRes] = await Promise.all([
        fetchWithAuth(getIdToken, '/api/admin/workshops'),
        fetchWithAuth(getIdToken, '/api/admin/speakers'),
        fetchWithAuth(getIdToken, '/api/admin/rooms'),
      ]);
      if (!workshopsRes.ok || !speakersRes.ok || !roomsRes.ok) throw new Error('Failed to load');
      const [workshopsData, speakersData, roomsData] = await Promise.all([
        workshopsRes.json(),
        speakersRes.json(),
        roomsRes.json(),
      ]);
      setWorkshops(workshopsData);
      setSpeakers(speakersData);
      setRooms(roomsData);
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
    setLoading(false);
  };

  const filteredWorkshops = useMemo(() => {
    if (typeFilter === 'all') return workshops;
    return workshops.filter((w) => w.type === typeFilter);
  }, [workshops, typeFilter]);

  const handleOpenDialog = (workshop?: Workshop) => {
    if (workshop) {
      setEditingId(workshop.id);
      setFormData({
        title: workshop.title,
        description: workshop.description ?? '',
        type: workshop.type ?? 'workshop',
        speaker_ids: workshop.speaker_ids ?? [],
        room_id: workshop.room_id ?? '',
        title_es: workshop.title_es ?? '',
        description_es: workshop.description_es ?? '',
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        type: 'workshop',
        speaker_ids: [],
        room_id: '',
        title_es: '',
        description_es: '',
      });
    }
    setDialogOpen(true);
  };

  const toggleSpeaker = (speakerId: string) => {
    setFormData((prev) => ({
      ...prev,
      speaker_ids: prev.speaker_ids.includes(speakerId)
        ? prev.speaker_ids.filter((id) => id !== speakerId)
        : [...prev.speaker_ids, speakerId],
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.requiredField,
      });
      return;
    }
    try {
      if (editingId) {
        const res = await fetchWithAuth(getIdToken, `/api/admin/workshops/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title.trim(),
            description: formData.description.trim(),
            type: formData.type,
            speaker_ids: formData.speaker_ids,
            room_id: formData.room_id.trim(),
            title_es: formData.title_es.trim() || undefined,
            description_es: formData.description_es.trim() || undefined,
          }),
        });
        if (!res.ok) throw new Error('Update failed');
      } else {
        const res = await fetchWithAuth(getIdToken, '/api/admin/workshops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title.trim(),
            description: formData.description.trim(),
            type: formData.type,
            speaker_ids: formData.speaker_ids,
            room_id: formData.room_id.trim(),
            title_es: formData.title_es.trim() || undefined,
            description_es: formData.description_es.trim() || undefined,
          }),
        });
        if (!res.ok) throw new Error('Create failed');
      }
      toast({
        title: t.common.success,
        description: t.admin.workshopsAndPlenarias.saved,
      });
      setDialogOpen(false);
      loadData();
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetchWithAuth(getIdToken, `/api/admin/workshops/${deleteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      toast({
        title: t.common.success,
        description: t.admin.workshopsAndPlenarias.deleted,
      });
      setDeleteId(null);
      loadData();
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
  };

  return (
    <AdminProtected>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{t.admin.workshopsAndPlenarias.title}</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                {t.admin.workshopsAndPlenarias.createNew}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId
                    ? t.admin.workshopsAndPlenarias.editWorkshop
                    : t.admin.workshopsAndPlenarias.createWorkshop}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>{t.admin.workshopsAndPlenarias.typeLabel}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as WorkshopType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workshop">{t.admin.workshopsAndPlenarias.typeWorkshop}</SelectItem>
                      <SelectItem value="plenaria">{t.admin.workshopsAndPlenarias.typePlenaria}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="workshop-title">{t.admin.workshopsAndPlenarias.titleLabel}</Label>
                  <Input
                    id="workshop-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t.admin.workshopsAndPlenarias.titlePlaceholder}
                  />
                </div>
                <div>
                  <Label htmlFor="workshop-description">{t.admin.workshopsAndPlenarias.description}</Label>
                  <Textarea
                    id="workshop-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t.admin.workshopsAndPlenarias.descriptionPlaceholder}
                    rows={4}
                  />
                </div>
                <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                  <p className="text-sm font-medium">{t.admin.workshopsAndPlenarias.translationEs}</p>
                  <div>
                    <Label htmlFor="workshop-title-es">{t.admin.workshopsAndPlenarias.titleLabel} (ES)</Label>
                    <Input
                      id="workshop-title-es"
                      value={formData.title_es}
                      onChange={(e) => setFormData({ ...formData, title_es: e.target.value })}
                      placeholder={t.admin.workshopsAndPlenarias.titlePlaceholder}
                    />
                  </div>
                  <div>
                    <Label htmlFor="workshop-description-es">{t.admin.workshopsAndPlenarias.description} (ES)</Label>
                    <Textarea
                      id="workshop-description-es"
                      value={formData.description_es}
                      onChange={(e) => setFormData({ ...formData, description_es: e.target.value })}
                      placeholder={t.admin.workshopsAndPlenarias.descriptionPlaceholder}
                      rows={2}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t.admin.workshopsAndPlenarias.room}</Label>
                  <Select
                    value={formData.room_id || '_none'}
                    onValueChange={(v) =>
                      setFormData({ ...formData, room_id: v === '_none' ? '' : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.admin.workshopsAndPlenarias.roomPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{t.admin.workshopsAndPlenarias.noRoom}</SelectItem>
                      {rooms.filter((r) => r.enabled !== false).map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t.admin.workshopsAndPlenarias.speakers}</Label>
                  <ScrollArea className="h-[180px] rounded-md border p-3">
                    <div className="flex flex-col gap-2">
                      {speakers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t.admin.workshopsAndPlenarias.noSpeakersAvailable}
                        </p>
                      ) : (
                        speakers.map((s) => (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 cursor-pointer rounded-sm py-1.5 hover:bg-muted/50 px-2 -mx-2"
                          >
                            <Checkbox
                              checked={formData.speaker_ids.includes(s.id)}
                              onCheckedChange={() => toggleSpeaker(s.id)}
                            />
                            <span className="text-sm">{s.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button onClick={handleSave}>{t.common.save}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <CardTitle>{t.admin.workshopsAndPlenarias.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="type-filter" className="text-sm font-medium whitespace-nowrap">
                {t.admin.workshopsAndPlenarias.filterLabel}
              </Label>
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as 'all' | 'workshop' | 'plenaria')}
              >
                <SelectTrigger id="type-filter" className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.admin.workshopsAndPlenarias.filterAll}</SelectItem>
                  <SelectItem value="workshop">{t.admin.workshopsAndPlenarias.typeWorkshop}</SelectItem>
                  <SelectItem value="plenaria">{t.admin.workshopsAndPlenarias.typePlenaria}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredWorkshops.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {t.admin.workshopsAndPlenarias.filterEmpty}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin.workshopsAndPlenarias.typeLabel}</TableHead>
                    <TableHead>{t.admin.workshopsAndPlenarias.titleLabel}</TableHead>
                    <TableHead className="max-w-[240px]">{t.admin.workshopsAndPlenarias.description}</TableHead>
                    <TableHead>{t.admin.workshopsAndPlenarias.room}</TableHead>
                    <TableHead>{t.admin.workshopsAndPlenarias.speaker}</TableHead>
                    <TableHead>{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkshops.map((workshop) => (
                    <TableRow key={workshop.id}>
                      <TableCell>
                        <Badge
                          className={
                            workshop.type === 'plenaria'
                              ? 'border-transparent bg-red-500 text-white hover:bg-red-600'
                              : 'border-transparent bg-blue-500 text-white hover:bg-blue-600'
                          }
                        >
                          {workshop.type === 'plenaria'
                            ? t.admin.workshopsAndPlenarias.typePlenaria
                            : t.admin.workshopsAndPlenarias.typeWorkshop}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{workshop.title}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-muted-foreground">
                        {workshop.description || '—'}
                      </TableCell>
                      <TableCell>{workshop.room_name || '—'}</TableCell>
                      <TableCell className="max-w-[180px]">{workshop.speaker_names || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(workshop)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(workshop.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.workshopsAndPlenarias.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.workshopsAndPlenarias.deleteWarning}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminProtected>
  );
}
