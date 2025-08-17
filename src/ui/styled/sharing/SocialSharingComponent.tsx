import React, { useState, useEffect } from 'react';
import { Button } from '@/ui/primitives/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/primitives/popover';
import { Link, Copy, Twitter, Linkedin, Facebook, Mail, Image as ImageIcon } from 'lucide-react'; // Assuming lucide-react for icons

// Define the expected shape of the item data REQUIRED by this component
interface SharedItemData {
  id: string;
  title: string;
  slug: string; // Used to generate the shareable URL path segment
  content_type: 'post' | 'image' | 'document' | string; // For conditional logic (e.g., Pinterest)
  url?: string; // For image/pinterest
  description?: string; // Potentially used in future share enhancements
}

interface SocialSharingComponentProps {
  // Accept the item data directly
  itemData: SharedItemData;
  // Allow overriding the base path for the share URL
  basePath?: string; 
}

// Declare trackEvent globally for this component context if not already done
declare global {
    interface Window {
        trackEvent?: (event: string, properties: Record<string, any>) => void;
    }
}

// Default base path if not provided
const DEFAULT_BASE_PATH = '/content/';

export const SocialSharingComponent: React.FC<SocialSharingComponentProps> = ({ 
    itemData, 
    basePath = DEFAULT_BASE_PATH 
}) => {
  // Removed internal item, isLoading, error states
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Effect to generate share URL when itemData or basePath changes
  useEffect(() => {
    if (itemData && itemData.slug) {
      // Ensure basePath starts and ends with a slash for consistency
      const formattedBasePath = `/${basePath.replace(/^\/+|\/+$/g, '')}/`; 
      const constructedUrl = `${window.location.origin}${formattedBasePath}${itemData.slug}`;
      setShareUrl(constructedUrl);
    } else {
      setShareUrl(''); // Clear URL if data is missing or invalid
      if (process.env.NODE_ENV === 'development') { console.warn('SocialSharingComponent: Missing itemData or slug for URL generation.'); }
    }
  // Recalculate URL if itemData or basePath prop changes
  }, [itemData, basePath]); 

  const trackShare = (platform: string) => {
      // Use itemData directly from props
      if (itemData && window.trackEvent) {
          window.trackEvent('share_content', {
              platform: platform,
              content_id: itemData.id,
              content_type: itemData.content_type,
              content_title: itemData.title
          });
      }
      // if (process.env.NODE_ENV === 'development') { console.log(`Shared on ${platform}`); }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      trackShare('copy_link');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Consider adding user feedback here (e.g., toast notification)
    }
  };

  const handleSocialShare = (platform: 'twitter' | 'linkedin' | 'facebook' | 'pinterest' | 'email') => {
    // Use itemData directly from props
    if (!shareUrl || !itemData) return;

    let url = '';
    const text = encodeURIComponent(itemData.title);
    const encodedShareUrl = encodeURIComponent(shareUrl);

    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodedShareUrl}&text=${text}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`;
        break;
      case 'pinterest':
        // Use itemData directly
        if (itemData.content_type === 'image' && itemData.url) {
           url = `https://pinterest.com/pin/create/button/?url=${encodedShareUrl}&media=${encodeURIComponent(itemData.url)}&description=${text}`;
        } else {
            if (process.env.NODE_ENV === 'development') { console.warn('Pinterest share requires image content type and URL.'); }
            return; 
        }
        break;
      case 'email': {
        const subject = encodeURIComponent(`Check out: ${itemData.title}`);
        const body = encodeURIComponent(`I thought you might find this interesting:\n\n${shareUrl}`);
        url = `mailto:?subject=${subject}&body=${body}`;
        break;
      }
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      trackShare(platform);
    }
  };

  // Removed loading and error return states as component assumes valid data is passed

  // Component only renders if valid itemData is provided
  if (!itemData) {
      if (process.env.NODE_ENV === 'development') { console.error('SocialSharingComponent: itemData prop is required.'); }
      return null; // Don't render anything if required data is missing
  }

  // Removed the hidden span for title - no longer needed as data is passed directly
  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        {/* The trigger button is always enabled now, as loading is handled by parent */}
        <Button variant="outline" aria-label="Share this item">Share</Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="flex items-center space-x-2" aria-label="Share options">
            {/* Display title directly from itemData prop */}
            <span className="text-sm font-medium mr-2 hidden sm:block" data-testid="shared-item-title">{itemData.title}</span>
           
            {/* Share Buttons */}
            <Button variant="ghost" size="icon" aria-label="Share on Twitter" onClick={() => handleSocialShare('twitter')}>
              <Twitter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Share on LinkedIn" onClick={() => handleSocialShare('linkedin')}>
              <Linkedin className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Share on Facebook" onClick={() => handleSocialShare('facebook')}>
              <Facebook className="h-4 w-4" />
            </Button>
            {/* Use itemData directly */}
            {itemData.content_type === 'image' && (
                <Button variant="ghost" size="icon" aria-label="Pin on Pinterest" onClick={() => handleSocialShare('pinterest')}>
                    <ImageIcon className="h-4 w-4"/>
                </Button>
            )}
            <Button variant="ghost" size="icon" aria-label="Share via Email" onClick={() => handleSocialShare('email')}>
              <Mail className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Copy link" onClick={handleCopyLink}>
              {isCopied ? <Copy className="h-4 w-4 text-green-500" /> : <Link className="h-4 w-4" />}
            </Button>
        </div>
        {isCopied && <p className="text-xs text-green-600 mt-1 text-center">Link copied!</p>} 
      </PopoverContent>
    </Popover>
  );
}; 