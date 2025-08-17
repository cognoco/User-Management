'use client';

import { SocialLoginCallbacks as HeadlessSocialLoginCallbacks } from '@/ui/headless/auth/SocialLoginCallbacks';
import { OAuthCallback } from './OAuthCallback';

export function SocialLoginCallbacks(): React.ReactElement {
  return (
    <HeadlessSocialLoginCallbacks render={() => <OAuthCallback />} />
  );
}
