import { Label } from '@/ui/primitives/label';
import { Switch } from '@/ui/primitives/switch';
import { FeatureFlagsPanel as HeadlessFeatureFlagsPanel } from '@/ui/headless/admin/FeatureFlagsPanel';

export function FeatureFlagsPanel(): React.ReactElement {
  return (
    <HeadlessFeatureFlagsPanel
      render={({ featureFlags, toggleFeature }) => (
        <div className="space-y-4">
          {Object.entries(featureFlags).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key}>{key}</Label>
              <Switch
                id={key}
                checked={value}
                onCheckedChange={(checked) =>
                  toggleFeature(key as keyof typeof featureFlags, checked === true)
                }
              />
            </div>
          ))}
        </div>
      )}
    />
  );
}

export default FeatureFlagsPanel;
