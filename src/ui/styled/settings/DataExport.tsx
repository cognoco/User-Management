import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { RadioGroup, RadioGroupItem } from '@/ui/primitives/radio-group';
import { Checkbox } from '@/ui/primitives/checkbox';
import { Label } from '@/ui/primitives/label';
import { Spinner } from '@/ui/primitives/spinner';
import { ExportFormat, ExportCategory } from '@/lib/utils/data-export';
import HeadlessDataExport from '@/ui/headless/settings/DataExport';

export function DataExport(): React.ReactElement {
  const { t } = useTranslation();
  const [selectedCategories, setSelectedCategories] = useState<ExportCategory[]>([ExportCategory.ALL]);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [anonymize, setAnonymize] = useState(false);
  const [prettify, setPrettify] = useState(true);

  const handleCategoryChange = (category: ExportCategory, checked: boolean) => {
    if (category === ExportCategory.ALL && checked) {
      setSelectedCategories([ExportCategory.ALL]);
    } else if (checked) {
      setSelectedCategories(prev => [...prev.filter(c => c !== ExportCategory.ALL && c !== category), category]);
    } else {
      setSelectedCategories(prev => prev.filter(c => c !== category));
    }
  };

  return (
    <HeadlessDataExport
      render={({ selectedFormat, setSelectedFormat, isLoading, error, initiateExport }) => (
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.dataExport.title')}</CardTitle>
            <CardDescription>{t('settings.dataExport.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">{t('settings.dataExport.format')}</h3>
              <RadioGroup
                value={selectedFormat}
                onValueChange={(value) => setSelectedFormat(value as ExportFormat)}
                className="grid grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={ExportFormat.JSON} id="json" />
                  <Label htmlFor="json">JSON</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={ExportFormat.CSV} id="csv" />
                  <Label htmlFor="csv">CSV</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium">{t('settings.dataExport.categories')}</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="all" checked={selectedCategories.includes(ExportCategory.ALL)} onCheckedChange={(c) => handleCategoryChange(ExportCategory.ALL, c === true)} />
                  <Label htmlFor="all">{t('settings.dataExport.categoryAll')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="profile" checked={selectedCategories.includes(ExportCategory.PROFILE)} onCheckedChange={(c) => handleCategoryChange(ExportCategory.PROFILE, c === true)} disabled={selectedCategories.includes(ExportCategory.ALL)} />
                  <Label htmlFor="profile">{t('settings.dataExport.categoryProfile')}</Label>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium">{t('settings.dataExport.options')}</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="timestamp" checked={includeTimestamp} onCheckedChange={(c) => setIncludeTimestamp(c === true)} />
                  <Label htmlFor="timestamp">{t('settings.dataExport.includeTimestamp')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="anonymize" checked={anonymize} onCheckedChange={(c) => setAnonymize(c === true)} />
                  <Label htmlFor="anonymize">{t('settings.dataExport.anonymize')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="prettify" checked={prettify} onCheckedChange={(c) => setPrettify(c === true)} disabled={selectedFormat !== ExportFormat.JSON && selectedFormat !== ExportFormat.XML} />
                  <Label htmlFor="prettify">{t('settings.dataExport.prettify')}</Label>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={initiateExport} disabled={isLoading} {...(isLoading ? { role: 'status' } : {})}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {t('settings.dataExport.exporting')}
                </>
              ) : (
                t('settings.dataExport.exportButton')
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    />
  );
}

export default DataExport;
