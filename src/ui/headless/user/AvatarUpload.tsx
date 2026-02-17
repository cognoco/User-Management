import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useProfileStore, profileStore } from '@/lib/stores/profile.store';
import { useUserManagement } from '@/lib/auth/UserManagementProvider';
import { api } from '@/lib/api/axios';
import { type Crop, PixelCrop } from 'react-image-crop';
import { 
  isValidImage, 
  MAX_FILE_SIZE, 
  ALLOWED_IMAGE_TYPES,
  canvasPreview
} from '@/lib/utils/file-upload';

// Predefined avatar type
export interface PredefinedAvatar {
  id: string;
  url: string;
  name: string;
}

export async function getCroppedImgBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  await canvasPreview(image, canvas, crop);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png', 0.9);
  });
}

export function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
): Crop {
  const mediaAspect = mediaWidth / mediaHeight;
  let cropWidth: number;
  let cropHeight: number;

  if (mediaAspect > aspect) {
    cropWidth = mediaHeight * aspect;
    cropHeight = mediaHeight;
  } else {
    cropHeight = mediaWidth / aspect;
    cropWidth = mediaWidth;
  }
  cropWidth *= 0.8;
  cropHeight *= 0.8;

  const x = (mediaWidth - cropWidth) / 2;
  const y = (mediaHeight - cropHeight) / 2;

  return {
    unit: 'px',
    x,
    y,
    width: cropWidth,
    height: cropHeight,
  };
}

export interface AvatarUploadRenderProps {
  profile: any | null;
  isLoading: boolean;
  uploadError: string | null;
  isModalOpen: boolean;
  activeTab: string;
  imgSrc: string;
  crop: Crop | undefined;
  completedCrop: PixelCrop | undefined;
  isProcessingCrop: boolean;
  predefinedAvatars: PredefinedAvatar[];
  selectedAvatarId: string | null;
  isLoadingAvatars: boolean;
  platform: string;
  isNative: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imgRef: React.RefObject<HTMLImageElement | null>;
  
  // Methods
  setActiveTab: (tab: string) => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleCropAndUpload: () => Promise<void>;
  handleSelectPredefinedAvatar: (avatarId: string) => void;
  handleApplySelectedAvatar: () => Promise<void>;
  handleRemove: () => Promise<void>;
  openAvatarModal: () => void;
  triggerFileInput: () => void;
  closeModalAndReset: () => void;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  setCrop: (crop: Crop) => void;
  setCompletedCrop: (crop: PixelCrop) => void;
  setIsModalOpen: (isOpen: boolean) => void;
}

export interface AvatarUploadProps {
  children: (props: AvatarUploadRenderProps) => React.ReactNode;
}

/**
 * Headless AvatarUpload component that contains all the business logic for avatar upload
 * Follows the render props pattern to allow for custom UI implementation
 */
export default function AvatarUpload({ children }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const { profile, uploadAvatar, removeAvatar, isLoading: storeLoading, error: storeError } = useProfileStore();
  const { platform, isNative } = useUserManagement();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect] = useState<number | undefined>(1);
  
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);
  const [predefinedAvatars, setPredefinedAvatars] = useState<PredefinedAvatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);

  useEffect(() => {
    setUploadError(null);
  }, [storeError, isModalOpen]);

  // Load predefined avatars when the component mounts
  useEffect(() => {
    async function fetchPredefinedAvatars() {
      setIsLoadingAvatars(true);
      try {
        const response = await api.get('/api/profile/avatar');
        setPredefinedAvatars(response.data.avatars || []);
      } catch (error) {
        console.error('Failed to load predefined avatars:', error);
        setUploadError('Failed to load predefined avatars');
      } finally {
        setIsLoadingAvatars(false);
      }
    }
    
    fetchPredefinedAvatars();
  }, []);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  }, [aspect]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!isValidImage(file)) {
      setUploadError(`Invalid file. Please upload an image (${ALLOWED_IMAGE_TYPES.join(', ')}) under ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      return;
    }
    
    const reader = new FileReader();
    reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
    reader.readAsDataURL(file);
  }, []);

  const handleCropAndUpload = useCallback(async () => {
    setUploadError(null);
    setIsProcessingCrop(true);
    
    try {
      if (!imgRef.current || !completedCrop?.width || !completedCrop?.height) {
        setUploadError('No image selected or crop area defined');
        return;
      }
      
      const croppedImageBlob = await getCroppedImgBlob(imgRef.current, completedCrop);
      if (!croppedImageBlob) {
        setUploadError('Failed to process image');
        return;
      }
      
      // Convert blob to File
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const file = new File([croppedImageBlob], 'avatar.png', { type: 'image/png' });
          await uploadAvatar(file);
          setIsModalOpen(false);
          setImgSrc('');
          setCrop(undefined);
          setCompletedCrop(undefined);
        } catch (error) {
          console.error('Error uploading avatar:', error);
          setUploadError('Failed to upload avatar');
        }
      };
      
      reader.onerror = () => {
        setUploadError('Failed to process image');
      };
      
      reader.readAsArrayBuffer(croppedImageBlob);
    } catch (error) {
      console.error('Error in crop and upload:', error);
      setUploadError('An error occurred while processing the image');
    } finally {
      setIsProcessingCrop(false);
    }
  }, [completedCrop, uploadAvatar]);

  const handleSelectPredefinedAvatar = useCallback((avatarId: string) => {
    setSelectedAvatarId(avatarId);
  }, []);

  const handleApplySelectedAvatar = useCallback(async () => {
    setUploadError(null);
    
    if (!selectedAvatarId) {
      setUploadError('No avatar selected');
      return;
    }
    
    try {
      const selectedAvatar = predefinedAvatars.find(avatar => avatar.id === selectedAvatarId);
      if (!selectedAvatar) {
        setUploadError('Selected avatar not found');
        return;
      }
      
      // Make API call to apply the predefined avatar
      await api.post('/api/profile/avatar/apply', { avatarId: selectedAvatarId });
      
      // Refresh the profile to show the new avatar
      await profileStore.getState().fetchProfile(undefined);
      
      setIsModalOpen(false);
      setSelectedAvatarId(null);
    } catch (error) {
      console.error('Error applying avatar:', error);
      setUploadError('Failed to apply selected avatar');
    }
  }, [selectedAvatarId, predefinedAvatars]);

  const handleRemove = useCallback(async () => {
    await removeAvatar();
  }, [removeAvatar]);

  const openAvatarModal = useCallback(() => {
    setUploadError(null);
    setIsModalOpen(true);
    setActiveTab("upload");
  }, []);

  const triggerFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const closeModalAndReset = useCallback(() => {
    setIsModalOpen(false);
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    setUploadError(null);
    setSelectedAvatarId(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return children({
    profile,
    isLoading: storeLoading || isProcessingCrop,
    uploadError,
    isModalOpen,
    activeTab,
    imgSrc,
    crop,
    completedCrop,
    isProcessingCrop,
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
  });
}
