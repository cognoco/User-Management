'use client';

import { Checkbox } from '@/ui/primitives/checkbox';
import { Label } from '@/ui/primitives/label';
import { RememberMeToggle as HeadlessRememberMeToggle } from '@/ui/headless/auth/RememberMeToggle';

interface RememberMeToggleProps {
  /** Initial checked state */
  initialChecked?: boolean;
  /** Optional callback when the value changes */
  onChange?: (checked: boolean) => void;
}

export function RememberMeToggle({ initialChecked = false, onChange }: RememberMeToggleProps): React.ReactElement {
  return (
    <HeadlessRememberMeToggle
      initialChecked={initialChecked}
      render={({ checked, setChecked }) => (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember-me"
            checked={checked}
            onCheckedChange={value => {
              const newValue = value === true;
              setChecked(newValue);
              onChange?.(newValue);
            }}
          />
          <Label htmlFor="remember-me">Remember me</Label>
        </div>
      )}
    />
  );
}
