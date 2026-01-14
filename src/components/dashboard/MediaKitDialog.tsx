'use client';

import { useState } from 'react';
import { Download, Share2, Building2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MediaKitDialogProps {
  videoId: string;
  address: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DownloadUrls {
  branded: {
    url: string;
    filename: string;
  };
  unbranded: {
    url: string | null;
    filename: string;
  };
}

/**
 * MediaKitDialog presents download options for branded and unbranded video versions.
 * Fetches download URLs from API and triggers browser downloads with descriptive filenames.
 */
export function MediaKitDialog({
  videoId,
  address,
  open,
  onOpenChange,
}: MediaKitDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [downloadUrls, setDownloadUrls] = useState<DownloadUrls | null>(null);
  const [downloadingType, setDownloadingType] = useState<'branded' | 'unbranded' | 'both' | null>(null);

  // Fetch download URLs when dialog opens
  const fetchUrls = async () => {
    if (downloadUrls) return downloadUrls;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/videos/${videoId}/download`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get download URLs');
      }
      const data = await response.json();
      setDownloadUrls(data);
      return data as DownloadUrls;
    } catch (error) {
      toast.error('Failed to load download options');
      console.error('Download URLs fetch error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger browser download
  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle download button click
  const handleDownload = async (type: 'branded' | 'unbranded' | 'both') => {
    setDownloadingType(type);

    const urls = await fetchUrls();
    if (!urls) {
      setDownloadingType(null);
      return;
    }

    if (type === 'branded' || type === 'both') {
      triggerDownload(urls.branded.url, urls.branded.filename);
      toast.success('Downloading branded video');
    }

    if ((type === 'unbranded' || type === 'both') && urls.unbranded.url) {
      // Small delay between downloads
      if (type === 'both') {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      triggerDownload(urls.unbranded.url, urls.unbranded.filename);
      if (type === 'unbranded') {
        toast.success('Downloading unbranded video');
      }
    }

    if (type === 'both' && urls.unbranded.url) {
      toast.success('Downloading both versions');
    }

    setDownloadingType(null);
  };

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDownloadUrls(null);
    }
    onOpenChange(newOpen);
  };

  const hasUnbranded = downloadUrls?.unbranded.url !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Download Media Kit</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {address}
          </DialogDescription>
        </DialogHeader>

        {/* Download options */}
        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Branded version */}
          <button
            onClick={() => handleDownload('branded')}
            disabled={isLoading || downloadingType !== null}
            className={cn(
              'flex flex-col items-center gap-3 p-4 rounded-xl border border-border',
              'bg-background hover:bg-muted/50 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-gold/50'
            )}
          >
            <div className="p-3 rounded-full bg-gold/10">
              {downloadingType === 'branded' ? (
                <Loader2 className="w-6 h-6 text-gold animate-spin" />
              ) : (
                <Share2 className="w-6 h-6 text-gold" />
              )}
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Branded</p>
              <p className="text-xs text-muted-foreground">For Social Media</p>
            </div>
          </button>

          {/* Unbranded version */}
          <button
            onClick={() => handleDownload('unbranded')}
            disabled={isLoading || downloadingType !== null || (downloadUrls && !hasUnbranded)}
            className={cn(
              'flex flex-col items-center gap-3 p-4 rounded-xl border border-border',
              'bg-background hover:bg-muted/50 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-gold/50'
            )}
          >
            <div className="p-3 rounded-full bg-muted/50">
              {downloadingType === 'unbranded' ? (
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              ) : (
                <Building2 className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Unbranded</p>
              <p className="text-xs text-muted-foreground">MLS Compliant</p>
            </div>
          </button>
        </div>

        {/* Download both button */}
        <Button
          onClick={() => handleDownload('both')}
          disabled={isLoading || downloadingType !== null}
          className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
        >
          {downloadingType === 'both' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {downloadUrls && hasUnbranded ? 'Download Both' : 'Download Video'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
