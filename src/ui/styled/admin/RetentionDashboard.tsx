import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/primitives/table';
import { Badge } from '@/ui/primitives/badge';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Skeleton } from '@/ui/primitives/skeleton';
import { RefreshCw, Trash2, Users, Clock, UserX, Archive } from 'lucide-react';
import {
  RetentionDashboard as HeadlessRetentionDashboard,
} from '@/ui/headless/admin/RetentionDashboard';

export function RetentionDashboard(): React.ReactElement {
  return (
    <HeadlessRetentionDashboard>
      {({
        metrics,
        pendingAccounts,
        filteredAccounts,
        searchQuery,
        setSearchQuery,
        isProcessing,
        metricsLoading,
        pendingLoading,
        pendingError,
        handleAnonymization,
        handleIdentifyInactive,
        formatDate,
        getStatusBadgeVariant,
      }) => (
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Data Retention Overview</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{metrics?.activeUsers || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Warning Stage</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{metrics?.warningUsers || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
                  <UserX className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{metrics?.inactiveUsers || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Anonymized</CardTitle>
                  <Archive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{metrics?.anonymizedUsers || 0}</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <h2 className="text-2xl font-bold tracking-tight">Accounts Pending Anonymization</h2>
              <div className="flex gap-2">
                <Button onClick={handleIdentifyInactive} disabled={isProcessing} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Identify Inactive
                </Button>
                <Button
                  onClick={handleAnonymization}
                  disabled={isProcessing || (pendingAccounts?.accounts.length || 0) === 0}
                  variant="destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Process Anonymization
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <CardTitle>Users to be Anonymized</CardTitle>
                    <CardDescription>
                      Accounts that have exceeded the retention period and are pending anonymization
                    </CardDescription>
                  </div>

                  <div className="w-full md:w-auto">
                    <Input
                      placeholder="Search by email or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-3 w-[200px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pendingError ? (
                  <div className="p-4 text-destructive">Error loading accounts pending anonymization</div>
                ) : filteredAccounts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No matching accounts found' : 'No accounts pending anonymization'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Anonymize After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.map((account) => (
                        <TableRow key={account.userId}>
                          <TableCell className="font-medium">{account.email}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(account.status)}>{account.status}</Badge>
                          </TableCell>
                          <TableCell>{account.retentionType}</TableCell>
                          <TableCell>{formatDate(account.lastLoginAt)}</TableCell>
                          <TableCell>{formatDate(account.anonymizeAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </HeadlessRetentionDashboard>
  );
}
