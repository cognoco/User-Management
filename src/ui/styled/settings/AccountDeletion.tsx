import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog';
import { Checkbox } from '@/ui/primitives/checkbox';
import { AccountDeletion as HeadlessAccountDeletion } from '@/ui/headless/account/AccountDeletion';

export function AccountDeletion(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <HeadlessAccountDeletion
      render={({
        isDialogOpen,
        setIsDialogOpen,
        password,
        setPassword,
        confirmText,
        setConfirmText,
        confirmChecked,
        setConfirmChecked,
        error,
        localError,
        isLoading,
        handleDeleteAccount,
      }) => (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">
              {t('settings.accountDeletion.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.accountDeletion.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('settings.accountDeletion.warning')}
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>{t('settings.accountDeletion.consequence1')}</li>
              <li>{t('settings.accountDeletion.consequence2')}</li>
              <li>{t('settings.accountDeletion.consequence3')}</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  {t('settings.accountDeletion.deleteButton')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t('settings.accountDeletion.confirmTitle')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('settings.accountDeletion.confirmDescription')}
                  </DialogDescription>
                </DialogHeader>
                {(error || localError) && (
                  <Alert variant="destructive" className="mt-4" role="alert">
                    <AlertDescription>{error || localError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      {t('settings.accountDeletion.password')}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-text">
                      {t('settings.accountDeletion.typeDelete')}
                    </Label>
                    <Input
                      id="confirm-text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="confirm-checkbox"
                      checked={confirmChecked}
                      onCheckedChange={(checked) =>
                        setConfirmChecked(checked === true)
                      }
                    />
                    <Label htmlFor="confirm-checkbox" className="text-sm">
                      {t('settings.accountDeletion.confirmCheckbox')}
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isLoading}
                  >
                    {isLoading
                      ? t('settings.accountDeletion.deleting')
                      : t('settings.accountDeletion.confirmButton')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      )}
    />
  );
}
