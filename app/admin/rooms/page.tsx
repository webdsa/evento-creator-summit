'use client';

import { useEffect, useState } from 'react';
import { AdminProtected } from '@/components/AdminProtected';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthProvider';
import { fetchWithAuth } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface Room {
  id: string;
  name: string;
  capacity: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export default function RoomsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, getIdToken } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    enabled: true as boolean,
  });

  useEffect(() => {
    if (!user) return;
    loadRooms();
  }, [user]);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(getIdToken, '/api/admin/rooms');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setRooms(data);
    } catch {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
    }
    setLoading(false);
  };

  const handleOpenDialog = (room?: Room) => {
    if (room) {
      setEditingId(room.id);
      setFormData({
        name: room.name,
        capacity: (room.capacity ?? 0).toString(),
        enabled: room.enabled !== false,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        capacity: '',
        enabled: true,
      });
    }
    setDialogOpen(true);
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
    const capacity = parseInt(formData.capacity, 10);
    if (isNaN(capacity) || capacity < 1) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.errors.genericError,
      });
      return;
    }
    try {
      if (editingId) {
        const res = await fetchWithAuth(getIdToken, `/api/admin/rooms/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            capacity,
            enabled: formData.enabled,
          }),
        });
        if (!res.ok) throw new Error('Update failed');
      } else {
        const res = await fetchWithAuth(getIdToken, '/api/admin/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            capacity,
            enabled: formData.enabled,
          }),
        });
        if (!res.ok) throw new Error('Create failed');
      }
      toast({
        title: t.common.success,
        description: t.admin.rooms.saved,
      });
      setDialogOpen(false);
      loadRooms();
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
      const res = await fetchWithAuth(getIdToken, `/api/admin/rooms/${deleteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      toast({
        title: t.common.success,
        description: t.admin.rooms.deleted,
      });
      setDeleteId(null);
      loadRooms();
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
          <h1 className="text-3xl font-bold">{t.admin.rooms.title}</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                {t.admin.rooms.createNew}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId
                    ? t.admin.rooms.editRoom
                    : t.admin.rooms.createRoom}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="room-name">{t.admin.rooms.name}</Label>
                  <Input
                    id="room-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="room-capacity">{t.admin.rooms.capacity}</Label>
                  <Input
                    id="room-capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t.admin.rooms.status}</Label>
                  <Select
                    value={formData.enabled ? 'active' : 'inactive'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, enabled: value === 'active' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t.common.active}</SelectItem>
                      <SelectItem value="inactive">{t.common.inactive}</SelectItem>
                    </SelectContent>
                  </Select>
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
            <CardTitle>{t.admin.rooms.title}</CardTitle>
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
                    <TableHead>{t.admin.rooms.name}</TableHead>
                    <TableHead>{t.admin.rooms.capacity}</TableHead>
                    <TableHead>{t.admin.rooms.status}</TableHead>
                    <TableHead>{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                      <TableCell>{room.capacity ?? 0}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            room.enabled !== false
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {room.enabled !== false ? t.common.active : t.common.inactive}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(room)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(room.id)}
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
            <AlertDialogTitle>{t.admin.rooms.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.rooms.deleteWarning}</AlertDialogDescription>
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
