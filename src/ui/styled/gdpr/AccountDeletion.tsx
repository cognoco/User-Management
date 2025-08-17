"use client";

import { useTranslation } from "react-i18next";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/ui/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/ui/primitives/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/ui/primitives/alert-dialog";
import { AccountDeletion as HeadlessAccountDeletion } from "../../headless/account/AccountDeletion";

export function AccountDeletion(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <HeadlessAccountDeletion
      render={({
        isDialogOpen,
        setIsDialogOpen,
        isLoading,
        error,
        localError,
        handleDeleteAccount,
      }) => (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">
              {t("gdpr.delete.title")}
            </CardTitle>
            <CardDescription>{t("gdpr.delete.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  {isLoading
                    ? t("common.loading")
                    : t("gdpr.delete.buttonText")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <AlertTriangle className="inline-block mr-2 h-5 w-5 text-destructive" />
                    {t("gdpr.delete.confirmTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("gdpr.delete.confirmDescription1")}
                    <strong className="text-destructive">
                      {t("gdpr.delete.confirmDescription2")}
                    </strong>
                    {t("gdpr.delete.confirmDescription3")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {(error || localError) && (
                  <p className="text-destructive text-sm" role="alert">
                    {error || localError}
                  </p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isLoading}>
                    {t("common.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isLoading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      t("gdpr.delete.confirmButton")
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground mt-3">
              {t("gdpr.delete.helpText")}
            </p>
          </CardContent>
        </Card>
      )}
    />
  );
}
