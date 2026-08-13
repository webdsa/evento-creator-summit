'use client';

import { useEffect, useState, useRef } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Upload, ImageIcon } from 'lucide-react';
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

export const dynamic = 'force-dynamic';

interface Speaker {
  id: string;
  name: string;
  biography: string;
  photo: string;
  created_at: string;
  updated_at: string;
}

export default function SpeakersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, getIdToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    biography: '',
    photo: '',
  });

  useEffect(() => {
    if (!user) return;
    loadSpeakers();
  }, [user]);

  const loadSpeakers = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(getIdToken, '/api/admin/speakers');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setSpeakers(data);
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
    setLoading(false);
  };

  const handleOpenDialog = (speaker?: Speaker) => {
    if (speaker) {
      setEditingId(speaker.id);
      setFormData({
        name: speaker.name,
        biography: speaker.biography ?? '',
        photo: speaker.photo ?? '',
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        biography: '',
        photo: '',
      });
    }
    setDialogOpen(true);
  };

  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const token = await getIdToken();
      const form = new FormData();
      form.append('photo', file);
      const res = await fetch('/api/admin/speakers/upload-photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 503) {
          const msg =
            data.error === 'bucketNotFound'
              ? t.admin.speakers.bucketNotFound
              : t.admin.speakers.uploadNotConfigured;
          toast({
            variant: 'destructive',
            title: t.common.error,
            description: msg,
          });
          return;
        }
        if (res.status === 400 && data.error === 'fileTooLarge') {
          toast({
            variant: 'destructive',
            title: t.common.error,
            description: t.admin.speakers.fileTooLarge,
          });
          return;
        }
        throw new Error('Upload failed');
      }
      const { url } = await res.json();
      setFormData((prev) => ({ ...prev, photo: url }));
      toast({
        title: t.common.success,
        description: t.admin.speakers.photoUploaded,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
    setUploadingPhoto(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.requiredField,
      });
      return;
    }
    try {
      if (editingId) {
        const res = await fetchWithAuth(getIdToken, `/api/admin/speakers/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            biography: formData.biography.trim(),
            photo: formData.photo.trim(),
          }),
        });
        if (!res.ok) throw new Error('Update failed');
      } else {
        const res = await fetchWithAuth(getIdToken, '/api/admin/speakers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            biography: formData.biography.trim(),
            photo: formData.photo.trim(),
          }),
        });
        if (!res.ok) throw new Error('Create failed');
      }
      toast({
        title: t.common.success,
        description: t.admin.speakers.saved,
      });
      setDialogOpen(false);
      loadSpeakers();
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
      const res = await fetchWithAuth(getIdToken, `/api/admin/speakers/${deleteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      toast({
        title: t.common.success,
        description: t.admin.speakers.deleted,
      });
      setDeleteId(null);
      loadSpeakers();
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
          <h1 className="text-3xl font-bold">{t.admin.speakers.title}</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                {t.admin.speakers.createNew}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId
                    ? t.admin.speakers.editSpeaker
                    : t.admin.speakers.createSpeaker}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="speaker-name">{t.admin.speakers.name}</Label>
                  <Input
                    id="speaker-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t.admin.speakers.namePlaceholder}
                  />
                </div>
                <div>
                  <Label htmlFor="speaker-biography">{t.admin.speakers.biography}</Label>
                  <Textarea
                    id="speaker-biography"
                    value={formData.biography}
                    onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
                    placeholder={t.admin.speakers.biographyPlaceholder}
                    rows={4}
                  />
                </div>
                <div>
                  <Label>{t.admin.speakers.photo}</Label>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handlePhotoFile}
                    />
                    <div className="flex gap-2 items-center flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingPhoto}
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {t.admin.speakers.uploadPhoto}
                      </Button>
                      {formData.photo && (
                        <div className="flex items-center gap-2">
                          {formData.photo.startsWith('http') ? (
                            <img
                              src={formData.photo}
                              alt=""
                              className="h-12 w-12 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full border flex items-center justify-center bg-muted">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Input
                      value={formData.photo}
                      onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                      placeholder={t.admin.speakers.photoUrlPlaceholder}
                      className="mt-1"
                    />
                  </div>
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
          <CardHeader>
            <CardTitle>{t.admin.speakers.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin.speakers.photo}</TableHead>
                    <TableHead>{t.admin.speakers.name}</TableHead>
                    <TableHead className="max-w-[300px]">{t.admin.speakers.biography}</TableHead>
                    <TableHead>{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {speakers.map((speaker) => (
                    <TableRow key={speaker.id}>
                      <TableCell>
                        {speaker.photo ? (
                          <img
                            src={speaker.photo}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{speaker.name}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {speaker.biography || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(speaker)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(speaker.id)}
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
            <AlertDialogTitle>{t.admin.speakers.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.speakers.deleteWarning}</AlertDialogDescription>
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
