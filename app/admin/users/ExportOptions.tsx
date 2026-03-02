'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/ui/primitives/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/primitives/popover';

interface ExportOptionsProps {
  searchParams: Record<string, any>;
}

export function ExportOptions({ searchParams }: ExportOptionsProps) {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
      const downloadUrl = `/api/admin/users/export?${queryParams.toString()}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `users-export-${new Date().toISOString().split('T')[0]}.${format}`);
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Download className="h-4 w-4" />
          <span>Export</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Export Options</h4>
          <div className="space-y-2">
            <label htmlFor="export-format" className="text-xs font-medium">
              Format
            </label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as 'csv' | 'json')}
              disabled={isExporting}
            >
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="w-full" onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
