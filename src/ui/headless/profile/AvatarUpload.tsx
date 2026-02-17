/**
 * Headless Avatar Upload Component
 *
 * Handles avatar selection, cropping and upload logic using the profile store.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useProfileStore } from '@/lib/stores/profile.store';
import { type Crop, PixelCrop } from 'react-image-crop';
import {
  isValidImage,
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  canvasPreview
} from '@/lib/utils/file-upload';

export interface AvatarUploadRenderProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imgRef: React.RefObject<HTMLImageElement | null>;
  imgSrc: string;
  crop: Crop | undefined;
  completedCrop: PixelCrop | undefined;
  isLoading: boolean;
  error: string | null;
  openFileDialog: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCropAndUpload: () => Promise<void>;
  setCrop: (c: Crop) => void;
  setCompletedCrop: (c: PixelCrop) => void;
  clear: () => void;
}

export interface AvatarUploadProps {
  children: (props: AvatarUploadRenderProps) => React.ReactNode;
}

export function AvatarUpload({ children }: AvatarUploadProps) {
  const { uploadAvatar, isLoading: storeLoading, error: storeError } = useProfileStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openFileDialog = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isValidImage(file)) {
      setError('Invalid file');
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
    reader.readAsDataURL(file);
  };

  const getCroppedImgBlob = async (image: HTMLImageElement, c: PixelCrop): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    await canvasPreview(image, canvas, c);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.9);
    });
  };

  const handleCropAndUpload = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;
    setProcessing(true);
    setError(null);
    try {
      const blob = await getCroppedImgBlob(imgRef.current, completedCrop);
      if (!blob) throw new Error('Failed to process image');
      await uploadAvatar(new File([blob], 'avatar.jpg', { type: blob.type }));
      clear();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  }, [completedCrop, uploadAvatar]);

  const clear = () => {
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      {children({
        fileInputRef,
        imgRef,
        imgSrc,
        crop,
        completedCrop,
        isLoading: storeLoading || processing,
        error: error || storeError,
        openFileDialog,
        handleFileChange,
        handleCropAndUpload,
        setCrop,
        setCompletedCrop,
        clear
      })}
    </>
  );
}

export default AvatarUpload;
