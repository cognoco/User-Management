import React, { useEffect, useRef, useState } from 'react';
import { useProfileStore } from '@/lib/stores/profile.store';
import type { ProfileVerificationStatus } from '@/types/profile';

export interface ProfileVerificationProps {
  enableDocumentUpload?: boolean;
}

const statusLabels: Record<ProfileVerificationStatus, string> = {
  unverified: 'Not Verified',
  pending: 'Pending Review',
  verified: 'Verified',
  rejected: 'Rejected',
};

const ProfileVerification: React.FC<ProfileVerificationProps> = ({ enableDocumentUpload = false }) => {
  const {
    verification,
    verificationLoading,
    verificationError,
    fetchVerificationStatus,
    requestVerification,
  } = useProfileStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [requesting, setRequesting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVerificationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRequestVerification = async (): Promise<void> => {
    setRequesting(true);
    await requestVerification(selectedFile || undefined);
    setRequesting(false);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canRequest =
    !verificationLoading &&
    !requesting &&
    (verification?.status === 'unverified' || verification?.status === 'rejected');

  return (
    <div className="rounded border p-4 max-w-md mx-auto bg-white shadow">
      <h3 className="text-lg font-semibold mb-2">Profile Verification</h3>
      {verificationLoading ? (
        <div className="text-gray-500">Loading verification status...</div>
      ) : verificationError ? (
        <div className="text-red-600">{verificationError}</div>
      ) : verification ? (
        <>
          <div className="mb-2">
            <span className="font-medium">Status:</span>{' '}
            <span
              className={
                verification.status === 'verified'
                  ? 'text-green-600'
                  : verification.status === 'pending'
                  ? 'text-yellow-600'
                  : verification.status === 'rejected'
                  ? 'text-red-600'
                  : 'text-gray-600'
              }
            >
              {statusLabels[verification.status]}
            </span>
          </div>
          {verification.status === 'rejected' && verification.admin_feedback && (
            <div className="mb-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
              <span className="font-medium">Reason:</span> {verification.admin_feedback}
            </div>
          )}
          {verification.status === 'verified' && (
            <div className="mb-2 text-green-700 bg-green-50 border border-green-200 rounded p-2">
              <span className="font-medium">Your profile is verified.</span>
            </div>
          )}
          {verification.status === 'pending' && (
            <div className="mb-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
              <span className="font-medium">Your verification request is under review.</span>
            </div>
          )}
          {canRequest && (
            <div className="mt-4">
              {enableDocumentUpload && (
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1" htmlFor="verification-document">
                    Upload supporting document (optional)
                  </label>
                  <input
                    id="verification-document"
                    type="file"
                    accept="image/*,application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="block w-full text-sm border rounded px-2 py-1"
                  />
                  {selectedFile && (
                    <div className="text-xs text-gray-600 mt-1">Selected: {selectedFile.name}</div>
                  )}
                </div>
              )}
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleRequestVerification}
                disabled={requesting || verificationLoading}
              >
                {requesting ? 'Requesting...' : 'Request Verification'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-gray-500">No verification data available.</div>
      )}
    </div>
  );
};

export default ProfileVerification;
