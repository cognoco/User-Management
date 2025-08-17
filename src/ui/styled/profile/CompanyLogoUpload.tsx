'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent } from '@/ui/primitives/card';
import { Alert, AlertTitle, AlertDescription } from '@/ui/primitives/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/ui/primitives/dialog';
import { Avatar } from '@/ui/primitives/avatar';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Upload, Building, Trash, Camera } from 'lucide-react';
import { useProfileStore } from '@/lib/stores/profile.store';
import { CompanyLogoUpload as HeadlessCompanyLogoUpload } from '@/ui/headless/profile/CompanyLogoUpload';

export function CompanyLogoUpload(): React.ReactElement {
  const { t } = useTranslation();
  const { profile } = useProfileStore();
  const hasLogo = Boolean(profile?.companyLogoUrl);

  return (
    <HeadlessCompanyLogoUpload>
      {({
        fileInputRef,
        imgRef,
        imgSrc,
        crop,
        completedCrop,
        isLoading,
        error,
        openFileDialog,
        handleFileChange,
        handleCropAndUpload,
        handleRemove,
        setCrop,
        setCompletedCrop,
        clear,
      }) => (
        <Card className="border-none shadow-none p-0">
          <CardContent className="pt-0 flex flex-col items-center space-y-4">
            <div className="relative" data-testid="company-logo-upload">
              <Avatar className="h-32 w-32 rounded-md border-4 border-background flex items-center justify-center overflow-hidden bg-muted">
                {imgSrc ? (
                  <Image ref={imgRef} src={imgSrc} alt="Company logo preview" width={128} height={128} className="h-full w-full object-cover" />
                ) : hasLogo && profile?.companyLogoUrl ? (
                  <Image src={profile.companyLogoUrl} alt="Company logo" width={128} height={128} className="h-full w-full object-cover" />
                ) : (
                  <Building className="h-1/2 w-1/2 text-muted-foreground" />
                )}
              </Avatar>
              <button
                type="button"
                className="absolute -bottom-3 -right-3 rounded-full bg-primary text-primary-foreground h-10 w-10 flex items-center justify-center shadow hover:bg-primary/90"
                onClick={openFileDialog}
                disabled={isLoading}
                aria-label={t('profile.changeCompanyLogo')}
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              data-testid="company-logo-file-input"
            />

            {hasLogo && (
              <Button type="button" variant="outline" onClick={handleRemove} disabled={isLoading} size="sm">
                <Trash className="mr-2 h-4 w-4" />
                {t('profile.removeCompanyLogo')}
              </Button>
            )}

            {error && (
              <Alert variant="destructive" className="w-full">
                <AlertTitle>{t('common.error')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Dialog open={!!imgSrc} onOpenChange={(open) => !open && clear()}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{t('profile.cropCompanyLogoTitle')}</DialogTitle>
                </DialogHeader>
                {imgSrc && (
                  <div className="mt-4 max-h-[60vh] overflow-auto">
                    <ReactCrop
                      crop={crop}
                      onChange={(_, c) => setCrop(c)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={1}
                      minWidth={100}
                      minHeight={100}
                    >
                      <Image ref={imgRef} alt="Image to crop for company logo" src={imgSrc} width={600} height={400} style={{ maxHeight: '50vh' }} />
                    </ReactCrop>
                  </div>
                )}
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={clear} disabled={isLoading}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleCropAndUpload} disabled={isLoading || !completedCrop?.width || !completedCrop?.height}>
                    {isLoading ? t('common.loading') : t('profile.uploadAndSave')}
                    <Upload className="ml-2 h-4 w-4" />
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </HeadlessCompanyLogoUpload>
  );
}

export default CompanyLogoUpload;
