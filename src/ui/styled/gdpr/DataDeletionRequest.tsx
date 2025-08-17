"use client";

import { Button } from "@/ui/primitives/button";
import { Alert, AlertDescription } from "@/ui/primitives/alert";
import { DataDeletionRequest as HeadlessDataDeletionRequest } from "../../headless/gdpr/DataDeletionRequest";

export function DataDeletionRequest(): React.ReactElement {
  return (
    <HeadlessDataDeletionRequest
      render={({ requestDeletion, isLoading, error }) => (
        <div className="space-y-2">
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={requestDeletion} disabled={isLoading}>
            {isLoading ? "Submitting..." : "Delete My Data"}
          </Button>
        </div>
      )}
    />
  );
}

export default DataDeletionRequest;
