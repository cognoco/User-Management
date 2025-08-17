'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent } from '@/ui/primitives/card';
import { Alert, AlertTitle, AlertDescription } from '@/ui/primitives/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/ui/primitives/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/ui/primitives/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/primitives/tabs";
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Upload, User, Trash, Camera, Image } from 'lucide-react';
import { getPlatformClasses } from '@/hooks/utils/usePlatformStyles';
import HeadlessAvatarUpload from '@/ui/headless/user/AvatarUpload';

/**
 * Styled AvatarUpload component that uses the headless AvatarUpload component
 * This component only contains UI elements and styling, with all business logic in the headless component
 */
export function AvatarUpload(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <HeadlessAvatarUpload>
      {({
        profile,
        isLoading,
        uploadError,
        isModalOpen,
        activeTab,
        imgSrc,
        crop,
        completedCrop,
        predefinedAvatars,
        selectedAvatarId,
        isLoadingAvatars,
        platform,
        isNative,
        fileInputRef,
        imgRef,
        
        // Methods
        setActiveTab,
        handleFileChange,
        handleCropAndUpload,
        handleSelectPredefinedAvatar,
        handleApplySelectedAvatar,
        handleRemove,
        openAvatarModal,
        triggerFileInput,
        closeModalAndReset,
        onImageLoad,
        setCrop,
        setCompletedCrop,
        setIsModalOpen
      }) => {
        const platformClasses = getPlatformClasses({}, { platform, isNative });
        
        return (
          <Card className={`${platformClasses}`}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24 cursor-pointer hover:opacity-90 transition-opacity" onClick={openAvatarModal}>
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile?.full_name || 'User'} />
                  ) : (
                    <AvatarFallback>
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={openAvatarModal}
                    disabled={isLoading}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {t('profile.changeAvatar')}
                  </Button>
                  
                  {profile?.avatar_url && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRemove}
                      disabled={isLoading}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      {t('profile.removeAvatar')}
                    </Button>
                  )}
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{t('profile.updateAvatar')}</DialogTitle>
                  </DialogHeader>
                  
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upload">{t('profile.uploadPhoto')}</TabsTrigger>
                      <TabsTrigger value="predefined">{t('profile.chooseAvatar')}</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="predefined" className="space-y-4">
                      {uploadError && (
                        <Alert variant="destructive">
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{uploadError}</AlertDescription>
                        </Alert>
                      )}
                      
                      {isLoadingAvatars ? (
                        <div className="flex justify-center items-center py-8">
                          <p>{t('common.loading')}</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-2">
                            {predefinedAvatars.map(avatar => (
                              <div 
                                key={avatar.id}
                                className={`cursor-pointer p-2 rounded-md transition-all ${selectedAvatarId === avatar.id ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted'}`}
                                onClick={() => handleSelectPredefinedAvatar(avatar.id)}
                              >
                                <Avatar className="h-16 w-16 mx-auto">
                                  <AvatarImage src={avatar.url} alt={avatar.name} />
                                  <AvatarFallback>{avatar.name[0]}</AvatarFallback>
                                </Avatar>
                                <p className="text-xs text-center mt-2">{avatar.name}</p>
                              </div>
                            ))}
                          </div>
                          
                          <DialogFooter>
                            <Button variant="outline" onClick={closeModalAndReset} disabled={isLoading}>
                              {t('common.cancel')}
                            </Button>
                            <Button onClick={handleApplySelectedAvatar} disabled={isLoading || !selectedAvatarId}>
                              {isLoading ? t('common.loading') : t('profile.applyAvatar')}
                            </Button>
                          </DialogFooter>
                        </>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="upload" className="space-y-4">
                      {uploadError && (
                        <Alert variant="destructive">
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{uploadError}</AlertDescription>
                        </Alert>
                      )}
                      
                      {!imgSrc ? (
                        <div className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-lg">
                          <Image className="h-10 w-10 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                              {t('profile.dragOrClick')}
                            </p>
                            <Button onClick={triggerFileInput} disabled={isLoading}>
                              {t('profile.selectImage')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 max-h-[60vh] overflow-auto"> 
                          <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={1}
                            minWidth={100}
                            minHeight={100}
                            circularCrop
                          >
                            <img
                              ref={imgRef}
                              alt="Crop me"
                              src={imgSrc}
                              onLoad={onImageLoad}
                              style={{ maxHeight: '50vh', margin: '0 auto' }}
                            />
                          </ReactCrop>
                        </div>
                      )}
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={closeModalAndReset} disabled={isLoading}>
                          {t('common.cancel')}
                        </Button>
                        {imgSrc && (
                          <Button 
                            onClick={handleCropAndUpload} 
                            disabled={isLoading || !completedCrop?.width || !completedCrop?.height}
                          >
                            {isLoading ? t('common.loading') : t('profile.uploadAndSave')}
                            <Upload className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                      </DialogFooter>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        );
      }}
    </HeadlessAvatarUpload>
  );
}
