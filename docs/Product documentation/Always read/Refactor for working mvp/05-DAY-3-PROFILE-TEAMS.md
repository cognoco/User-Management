# Day 3: Profile Management & Team Features

## Goal
Build complete profile management and team collaboration features.

## Morning (4 hours): Profile Management

### 1. Profile Service (1 hour)
```typescript
// src/lib/services/profile.service.ts
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export interface ProfileData {
  first_name: string
  last_name: string
  bio?: string
  avatar_url?: string
  phone?: string
  location?: string
  website?: string
}

export class ProfileService {
  async getProfile(userId: string) {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  }

  async updateProfile(userId: string, data: Partial<ProfileData>) {
    const supabase = await createClient()
    
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  async uploadAvatar(userId: string, file: File) {
    const supabase = await createClient()
    
    // Upload to storage
    const fileName = `${userId}-${Date.now()}.${file.name.split('.').pop()}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    // Update profile
    await this.updateProfile(userId, { avatar_url: publicUrl })

    return publicUrl
  }

  async deleteAccount(userId: string) {
    const supabase = createServiceClient()
    
    // Delete user (cascades to profile)
    const { error } = await supabase.auth.admin.deleteUser(userId)
    
    if (error) throw error
  }
}
```

### 2. Profile Page (1.5 hours)
```typescript
// src/app/dashboard/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="container max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
      <ProfileForm initialData={profile} userId={user.id} />
    </div>
  )
}

// src/app/dashboard/profile/profile-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { toast } from '@/components/ui/use-toast'

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  bio: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
})

export default function ProfileForm({ initialData, userId }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url)

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData || {}
  })

  async function onSubmit(data) {
    setLoading(true)
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast({ title: 'Profile updated successfully' })
        router.refresh()
      }
    } catch (error) {
      toast({ 
        title: 'Error updating profile', 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/profile/avatar', {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      const { url } = await response.json()
      setAvatarUrl(url)
      toast({ title: 'Avatar uploaded successfully' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>
            {initialData?.first_name?.[0]}
            {initialData?.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <Input
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="max-w-xs"
          />
          <p className="text-sm text-gray-500 mt-1">
            JPG, PNG or GIF, max 2MB
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Form fields for all profile data */}
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
```

### 3. Profile API Routes (30 min)
```typescript
// src/app/api/profile/route.ts
// GET and PATCH endpoints

// src/app/api/profile/avatar/route.ts
// POST endpoint for avatar upload
```

## Afternoon (4 hours): Team Management

### 1. Team Service (1 hour)
```typescript
// src/lib/services/team.service.ts
import { createClient } from '@/lib/supabase/server'
import { EmailService } from '@/lib/email/email.service'

export class TeamService {
  private emailService = new EmailService()

  async createTeam(data: {
    name: string
    description?: string
    ownerId: string
  }) {
    const supabase = await createClient()
    
    // Create team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: data.name,
        description: data.description,
        owner_id: data.ownerId,
      })
      .select()
      .single()

    if (teamError) throw teamError

    // Add owner as member
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: data.ownerId,
        role: 'owner',
      })

    if (memberError) throw memberError

    return team
  }

  async getUserTeams(userId: string) {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        role,
        team:teams(*)
      `)
      .eq('user_id', userId)

    if (error) throw error
    return data
  }

  async inviteMember(teamId: string, email: string, role: string) {
    const supabase = await createClient()
    
    // Create invitation
    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email,
        role,
        token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
      .select()
      .single()

    if (error) throw error

    // Send invitation email
    await this.emailService.sendTeamInvitation(
      email,
      invitation.token,
      teamId
    )

    return invitation
  }

  async acceptInvitation(token: string, userId: string) {
    const supabase = await createClient()
    
    // Get invitation
    const { data: invitation, error: invError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (invError) throw invError
    if (!invitation) throw new Error('Invalid invitation')

    // Add member
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: invitation.team_id,
        user_id: userId,
        role: invitation.role,
      })

    if (memberError) throw memberError

    // Delete invitation
    await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitation.id)

    return invitation.team_id
  }

  async updateMemberRole(teamId: string, userId: string, newRole: string) {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('team_members')
      .update({ role: newRole })
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (error) throw error
  }

  async removeMember(teamId: string, userId: string) {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (error) throw error
  }
}
```

### 2. Teams Dashboard (1.5 hours)
```typescript
// src/app/dashboard/teams/page.tsx
// List user's teams
// Create new team button

// src/app/dashboard/teams/[teamId]/page.tsx
// Team details
// Member list
// Invite member form
// Role management (if owner/admin)

// src/app/dashboard/teams/new/page.tsx
// Create team form
```

### 3. Team API Routes (1 hour)
```typescript
// src/app/api/teams/route.ts
// GET (list teams) and POST (create team)

// src/app/api/teams/[teamId]/route.ts
// GET, PATCH, DELETE

// src/app/api/teams/[teamId]/members/route.ts
// GET (list members) and POST (invite)

// src/app/api/teams/[teamId]/members/[userId]/route.ts
// PATCH (update role) and DELETE (remove)

// src/app/api/teams/invitations/[token]/route.ts
// POST (accept invitation)
```

### 4. Permissions Middleware (30 min)
```typescript
// src/lib/middleware/permissions.ts
export async function checkTeamPermission(
  userId: string,
  teamId: string,
  requiredRole: string[]
) {
  const supabase = await createClient()
  
  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single()

  if (!member) return false
  
  return requiredRole.includes(member.role)
}
```

## Testing Checklist

### Profile Management
- [ ] View profile information
- [ ] Edit profile fields
- [ ] Upload avatar image
- [ ] Avatar displays correctly
- [ ] Delete account (GDPR)

### Team Features
- [ ] Create new team
- [ ] List user's teams
- [ ] View team details
- [ ] Invite team members
- [ ] Receive invitation email
- [ ] Accept invitation
- [ ] Update member roles (owner only)
- [ ] Remove team members (owner/admin)
- [ ] Leave team

## End of Day 3 Deliverables

1. **Complete Profile System**
   - View/Edit profile
   - Avatar upload
   - Account deletion

2. **Team Collaboration**
   - Create/manage teams
   - Invite system with emails
   - Role-based permissions

3. **Clean Architecture**
   - Services for business logic
   - Proper authorization
   - Email integration