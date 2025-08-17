import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card';
import { Progress } from '@/ui/primitives/progress';
import { Badge } from '@/ui/primitives/badge';
import { Skeleton } from '@/ui/primitives/skeleton';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Activity,
} from 'lucide-react';
import {
  AdminDashboard as HeadlessAdminDashboard,
} from '@/ui/headless/admin/AdminDashboard';

export function AdminDashboard(): React.ReactElement {
  return (
    <HeadlessAdminDashboard>
      {({ data, isLoading, isError }) => {
        if (isError) {
          return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-6 w-6 mb-2" />
              <h2 className="text-lg font-semibold">Error Loading Dashboard</h2>
              <p>Failed to load dashboard data. Please try again later.</p>
            </div>
          );
        }

        return (
          <div className="space-y-8">
            {/* Team Overview Section */}
            <section>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Team Overview</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <div className="text-2xl font-bold">{data?.team.totalMembers}</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <div className="text-2xl font-bold">{data?.team.activeMembers}</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <div className="text-2xl font-bold">{data?.team.pendingMembers}</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Seat Usage</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-7 w-full" />
                    ) : (
                      <div className="space-y-2">
                        <div className="text-2xl font-bold">
                          {data?.team.seatUsage.used}/{data?.team.seatUsage.total}
                        </div>
                        <Progress value={data?.team.seatUsage.percentage} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Subscription Status Section */}
            <section>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Subscription Status</h2>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Current Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold capitalize">{data?.subscription.plan}</span>
                        <Badge variant={data?.subscription.status === 'active' ? 'default' : 'secondary'}>
                          {data?.subscription.status}
                        </Badge>
                      </div>
                      {data?.subscription.trialEndsAt && (
                        <p className="text-sm text-muted-foreground">
                          Trial ends {formatDistanceToNow(new Date(data.subscription.trialEndsAt), { addSuffix: true })}
                        </p>
                      )}
                      {data?.subscription.currentPeriodEndsAt && (
                        <p className="text-sm text-muted-foreground">
                          Current period ends {format(new Date(data.subscription.currentPeriodEndsAt), 'MMMM d, yyyy')}
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Recent Activity Section */}
            <section>
              <h2 className="text-2xl font-bold tracking-tight mb-4">Recent Activity</h2>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Latest Events
                  </CardTitle>
                  <CardDescription>
                    Recent team activity and system events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-3 w-[200px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : data?.recentActivity.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No recent activity to display
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {data?.recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Activity className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              by {activity.user.name} • {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        );
      }}
    </HeadlessAdminDashboard>
  );
}
