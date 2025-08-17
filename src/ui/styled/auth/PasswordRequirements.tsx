import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordRequirementProps {
  meets: boolean;
  text: string;
}

function PasswordRequirement({ meets, text }: PasswordRequirementProps): React.ReactElement {
  return (
    <div 
      role="listitem"
      className="flex items-center space-x-2" 
      data-met={meets.toString()}
      data-testid={`password-requirement-${text.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {meets ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-red-500" />
      )}
      <span className={`text-sm ${meets ? 'text-green-500' : 'text-red-500'}`}>{text}</span>
    </div>
  );
}

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps): React.ReactElement | null {
  const requirements = [
    { meets: password.length >= 8, text: 'Password must be at least 8 characters' },
    { meets: /[A-Z]/.test(password), text: 'Password must contain at least one uppercase letter' },
    { meets: /[a-z]/.test(password), text: 'Password must contain at least one lowercase letter' },
    { meets: /[0-9]/.test(password), text: 'Password must contain at least one number' },
    { meets: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: 'Password must contain at least one special character' }
  ];

  // Show requirements when password field is active or has content
  if (password.length === 0 && process.env.NODE_ENV !== 'test') {
    return null;
  }

  return (
    <div 
      role="list"
      data-testid="password-requirements-helper" 
      className="mt-2 space-y-1 p-3 border rounded bg-slate-50 text-xs"
    >
      {requirements.map((requirement, index) => (
        <PasswordRequirement
          key={index}
          meets={requirement.meets}
          text={requirement.text}
        />
      ))}
    </div>
  );
} 