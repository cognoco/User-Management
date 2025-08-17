"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/ui/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/ui/primitives/card";
import { Alert, AlertDescription } from "@/ui/primitives/alert";
import { RadioGroup, RadioGroupItem } from "@/ui/primitives/radio-group";
import { Label } from "@/ui/primitives/label";
import { Progress } from "@/ui/primitives/progress";
import { useToast } from "@/lib/hooks/use-toast";
import { useIsMobile } from "@/lib/utils/responsive";
import {
  DataExport as HeadlessDataExport,
  ExportFormat,
} from "../../headless/settings/DataExport";

export function DataExport(): React.ReactElement {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [progress, setProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <HeadlessDataExport
      onComplete={() => setShowSuccess(true)}
      render={({
        selectedFormat,
        setSelectedFormat,
        isLoading,
        error,
        handleExport,
      }) => (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t("gdpr.export.title")}</CardTitle>
            <CardDescription>{t("gdpr.export.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {showSuccess && (
              <Alert
                className="bg-green-50 border-green-200 flex items-center gap-2"
                role="alert"
              >
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-sm">
                  {t("gdpr.export.successDescription")}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">{t("gdpr.export.format")}</h3>
              <RadioGroup
                value={selectedFormat}
                onValueChange={(val) => setSelectedFormat(val as ExportFormat)}
                className={
                  isMobile ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2"
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={ExportFormat.JSON} id="json" />
                  <Label htmlFor="json" className="cursor-pointer">
                    JSON
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={ExportFormat.CSV} id="csv" />
                  <Label htmlFor="csv" className="cursor-pointer">
                    CSV
                  </Label>
                </div>
              </RadioGroup>
            </div>
            {isLoading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("gdpr.export.preparing")}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t("gdpr.export.helpText")}
            </p>
          </CardContent>
          <CardFooter
            className={
              isMobile ? "flex-col space-y-4" : "flex-row justify-between"
            }
          >
            <Button
              onClick={async () => {
                setShowSuccess(false);
                setProgress(0);
                const interval = setInterval(() => {
                  setProgress((p) => Math.min(p + Math.random() * 10, 90));
                }, 500);
                await handleExport();
                clearInterval(interval);
                setProgress(100);
                toast({
                  title: t("gdpr.export.successTitle"),
                  description: t("gdpr.export.successDescription"),
                });
              }}
              disabled={isLoading}
              className={isMobile ? "w-full" : ""}
              {...(isLoading ? { role: "status" } : {})}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isLoading ? t("common.loading") : t("gdpr.export.buttonText")}
            </Button>
            <div className="flex items-center text-xs text-muted-foreground gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>{t("gdpr.export.dataPrivacyNote")}</span>
            </div>
          </CardFooter>
        </Card>
      )}
    />
  );
}
