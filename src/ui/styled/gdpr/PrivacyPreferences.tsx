"use client";

import { Checkbox } from "@/ui/primitives/checkbox";
import { Label } from "@/ui/primitives/label";
import { Button } from "@/ui/primitives/button";
import { usePreferencesStore } from "@/lib/stores/preferences.store";

export function PrivacyPreferences() {
  const { preferences, updatePreferences } = usePreferencesStore();
  const marketing = !!preferences?.notifications?.marketing;

  const toggle = async () => {
    await updatePreferences({ notifications: { push: false, email: false, ...preferences?.notifications, marketing: !marketing } });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox id="marketing" checked={marketing} onCheckedChange={toggle} />
        <Label htmlFor="marketing">Allow marketing emails</Label>
      </div>
      <Button onClick={toggle}>Save</Button>
    </div>
  );
}

export default PrivacyPreferences;
