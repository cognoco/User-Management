import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import DataExport from './DataExport';
import CompanyDataExport from './CompanyDataExport';
import NotificationPreferences from './NotificationPreferences';
import ActivityLog from './ActivityLog';
import ProfileHeadless from '@/ui/headless/user/Profile';

interface FormState {
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl: string;
}

export default function Profile(): React.ReactElement {
  const [form, setForm] = useState<FormState>({ firstName: '', lastName: '', username: '', avatarUrl: '' });

  return (
    <ProfileHeadless>
      {({ profile, isLoading, error, successMessage, uploadingAvatar, updateProfile, uploadAvatar }) => {
        // Update form when profile changes (avoiding hooks inside render prop)
        if (profile && (form.firstName !== (profile.firstName || '') || 
                       form.lastName !== (profile.lastName || '') ||
                       form.username !== (profile.username || '') || 
                       form.avatarUrl !== (profile.profilePictureUrl || ''))) {
          setForm({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            username: profile.username || '',
            avatarUrl: profile.profilePictureUrl || ''
          });
        }

        const handleSubmit = async (e: React.FormEvent): Promise<void> => {
          e.preventDefault();
          await updateProfile({ 
            firstName: form.firstName, 
            lastName: form.lastName,
            username: form.username 
          });
        };

        const handleFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
          const file = e.target.files?.[0];
          if (file) uploadAvatar(file);
        };

        if (isLoading && !profile) return <div>Loading...</div>;
        if (!profile) return <div>No profile found</div>;

        return (
          <div className="profile">
            <h2>Profile</h2>
            {error && (
              <Alert variant="destructive" role="alert" className="error-message">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert role="alert">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            <div className="avatar">
              <Image src={form.avatarUrl || 'https://example.com/avatar.jpg'} alt="User avatar" width={150} height={150} className="rounded-full object-cover" />
              <div className="avatar-upload">
                <label htmlFor="avatar-upload">
                  Upload Avatar
                  <input id="avatar-upload" type="file" accept="image/*" onChange={handleFile} disabled={uploadingAvatar} />
                </label>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div>
                <label>
                  First Name:
                  <Input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </label>
              </div>
              <div>
                <label>
                  Last Name:
                  <Input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </label>
              </div>
              <div>
                <label>
                  Username:
                  <Input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </label>
              </div>
              <div className="button-container">
                <Button type="submit" disabled={isLoading}>Update Profile</Button>
              </div>
            </form>
            <hr style={{ margin: '2rem 0' }} />
            <DataExport />
            <CompanyDataExport />
            <hr style={{ margin: '2rem 0' }} />
            <NotificationPreferences />
            <hr style={{ margin: '2rem 0' }} />
            <ActivityLog />
            <style jsx>{`
              .profile {
                max-width: 500px;
                margin: 0 auto;
                padding: 20px;
              }
              .avatar {
                margin: 20px 0;
                text-align: center;
              }
              .avatar img {
                width: 150px;
                height: 150px;
                border-radius: 50%;
                object-fit: cover;
              }
              .avatar-upload {
                margin-top: 10px;
              }
              .avatar-upload input[type='file'] {
                display: none;
              }
              .avatar-upload label {
                cursor: pointer;
                padding: 8px 16px;
                background-color: #3b82f6;
                color: white;
                border-radius: 4px;
                display: inline-block;
              }
              label {
                display: block;
                margin: 10px 0;
              }
              input {
                width: 100%;
                padding: 8px;
                margin-top: 5px;
                border: 1px solid #ddd;
                border-radius: 4px;
              }
              .button-container {
                margin-top: 20px;
                text-align: center;
              }
            `}</style>
          </div>
        );
      }}
    </ProfileHeadless>
  );
} 