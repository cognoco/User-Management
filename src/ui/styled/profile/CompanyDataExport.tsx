import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { CompanyDataExport as HeadlessCompanyDataExport } from '@/ui/headless/profile/CompanyDataExport';

export default function CompanyDataExport(): React.ReactElement {
  return (
    <HeadlessCompanyDataExport>
      {({ isExporting, error, success, exportData }) => (
        <Card className="rounded border p-4 max-w-lg mx-auto bg-white shadow mt-6">
          <CardHeader>
            <CardTitle>Export Company Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Download a copy of your company profile, team members, roles, and activity logs. This export is provided in JSON format for compliance, backup, or migration needs. Only company admins can access this export.
            </p>
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert role="alert">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            <Button onClick={exportData} disabled={isExporting} {...(isExporting ? { role: 'status' } : {})}>
              {isExporting ? 'Generating export...' : 'Download Company Data'}
            </Button>
          </CardContent>
        </Card>
      )}
    </HeadlessCompanyDataExport>
  );
}