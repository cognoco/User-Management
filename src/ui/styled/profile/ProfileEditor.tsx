'use client';

import React, { useEffect, useRef, useState } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Textarea } from '@/ui/primitives/textarea';
import { Avatar } from '@/ui/primitives/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/primitives/dialog';
import { useProfileStore } from '@/lib/stores/profile.store';
import { ConnectedAccounts } from '@/ui/styled/shared/ConnectedAccounts';

export function ProfileEditor(): React.ReactElement {
  const { profile, updateProfile, uploadAvatar, error } = useProfileStore();
  const [form, setForm] = useState({ name: '', bio: '', location: '', website: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const cropperRef = useRef<Cropper>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        name: (profile as any).name ?? '',
        bio: profile.bio ?? '',
        location: (profile as any).location ?? '',
        website: profile.website ?? ''
      });
      setAvatarPreview((profile as any).avatarUrl ?? profile.avatar_url ?? null);
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await updateProfile(form as any);
    setIsSubmitting(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setTempAvatar(reader.result as string);
      setIsAvatarDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async () => {
    if (cropperRef.current) {
      const canvas = cropperRef.current.getCroppedCanvas();
      canvas.toBlob(async (blob) => {
        if (blob) {
          await uploadAvatar(blob);
          setAvatarPreview(canvas.toDataURL());
        }
      });
      setIsAvatarDialogOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <Avatar className="h-20 w-20">
          <img src={avatarPreview || '/default-avatar.png'} alt="Profile" />
        </Avatar>
        <div>
          <Input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
            id="avatar-upload"
            data-testid="avatar-upload"
          />
          <Label htmlFor="avatar-upload">
            <Button variant="outline" className="cursor-pointer">
              Change Avatar
            </Button>
          </Label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" value={form.name} onChange={handleChange} aria-label="Name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" value={form.website} onChange={handleChange} aria-label="Website" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" name="bio" value={form.bio} onChange={handleChange} aria-label="Bio" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" value={form.location} onChange={handleChange} aria-label="Location" />
        </div>
        {error && (
          <div className="text-destructive" role="alert">
            {error}
          </div>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Profile'}
        </Button>
      </form>

      <div className="pt-8">
        <h3 className="text-lg font-medium mb-4">Connected Accounts</h3>
        <ConnectedAccounts variant="profile" />
      </div>

      <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crop Avatar</DialogTitle>
          </DialogHeader>
          {tempAvatar && (
            <>
              <Cropper
                ref={cropperRef}
                src={tempAvatar}
                style={{ height: 400, width: '100%' }}
                aspectRatio={1}
                guides={false}
              />
              <Button onClick={handleCropComplete}>Save</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
