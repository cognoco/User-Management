'use client';

import * as React from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { Form, FormField, FormItem, FormControl, FormDescription } from '@/ui/primitives/form';
import { Label } from '@/ui/primitives/label';
import { Input } from '@/ui/primitives/input';
import { Textarea } from '@/ui/primitives/textarea';
import { Switch } from '@/ui/primitives/switch';
import { Button } from '@/ui/primitives/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select';
import { useUserStore } from '@/lib/stores/user.store';

const profileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  bio: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  phone_number: z.string().optional(),
  settings: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    language: z.enum(['en', 'es', 'fr']).default('en'),
    email_notifications: z.boolean().default(true),
    push_notifications: z.boolean().default(true),
    two_factor_auth: z.boolean().default(false),
    login_alerts: z.boolean().default(true),
  }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileCompletion() {
  const { t } = useTranslation();
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const { updateProfile, updateSettings, uploadAvatar } = useUserStore();
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema) as Resolver<ProfileFormData>,
    defaultValues: {
      settings: {
        theme: 'light',
        language: 'en',
        email_notifications: true,
        push_notifications: true,
        two_factor_auth: false,
        login_alerts: true,
      },
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      let avatarUrl = '';
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }
      
      const { settings, ...profileData } = data;
      
      await Promise.all([
        updateProfile({
          ...profileData,
          avatar_url: avatarUrl || null,
        }),
        updateSettings(settings),
      ]);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') { console.error('Error updating profile:', error) }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="avatar">{t('profile.avatar.label')}</Label>
          <Input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor={field.name}>{t('profile.firstName')}</Label>
                <FormControl>
                  <Input id={field.name} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor={field.name}>{t('profile.lastName')}</Label>
                <FormControl>
                  <Input id={field.name} {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor={field.name}>{t('profile.bio')}</Label>
              <FormControl>
                <Textarea id={field.name} {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date_of_birth"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor={field.name}>{t('profile.dateOfBirth')}</Label>
                <FormControl>
                  <Input id={field.name} type="date" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor={field.name}>{t('profile.gender')}</Label>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder={t('profile.selectGender')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">{t('profile.gender.male')}</SelectItem>
                    <SelectItem value="female">{t('profile.gender.female')}</SelectItem>
                    <SelectItem value="other">{t('profile.gender.other')}</SelectItem>
                    <SelectItem value="prefer_not_to_say">{t('profile.gender.preferNotToSay')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor={field.name}>{t('profile.address')}</Label>
              <FormControl>
                <Input id={field.name} {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor={field.name}>{t('profile.city')}</Label>
                <FormControl>
                  <Input id={field.name} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor={field.name}>{t('profile.state')}</Label>
                <FormControl>
                  <Input id={field.name} {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor={field.name}>{t('profile.country')}</Label>
                <FormControl>
                  <Input id={field.name} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor={field.name}>{t('profile.postalCode')}</Label>
                <FormControl>
                  <Input id={field.name} {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone_number"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor={field.name}>{t('profile.phoneNumber')}</Label>
              <FormControl>
                <Input id={field.name} type="tel" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t('settings.preferences')}</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="settings.theme"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor={field.name}>{t('settings.theme')}</Label>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger id={field.name}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="light">{t('settings.theme.light')}</SelectItem>
                      <SelectItem value="dark">{t('settings.theme.dark')}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="settings.language"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor={field.name}>{t('settings.language')}</Label>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger id={field.name}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en">{t('settings.language.english')}</SelectItem>
                      <SelectItem value="es">{t('settings.language.spanish')}</SelectItem>
                      <SelectItem value="fr">{t('settings.language.french')}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="settings.email_notifications"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={field.name}>{t('settings.emailNotifications')}</Label>
                  <FormDescription>
                    {t('settings.emailNotifications.description')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    id={field.name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="settings.push_notifications"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={field.name}>{t('settings.pushNotifications')}</Label>
                  <FormDescription>
                    {t('settings.pushNotifications.description')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    id={field.name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="settings.two_factor_auth"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={field.name}>{t('settings.twoFactorAuth')}</Label>
                  <FormDescription>
                    {t('settings.twoFactorAuth.description')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    id={field.name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="settings.login_alerts"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={field.name}>{t('settings.loginAlerts')}</Label>
                  <FormDescription>
                    {t('settings.loginAlerts.description')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    id={field.name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full">
          {t('profile.complete')}
        </Button>
      </form>
    </Form>
  );
} 