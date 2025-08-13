import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';

const CompanySchema = z.object({ companyName: z.string() });

const postHandler = async ({ data }: { data: z.infer<typeof CompanySchema> }) => {
  const { companyName } = data;

  const cleaned = companyName.trim();
  const validChars = /^[a-zA-Z0-9 .,&'-]+$/;
  const words = cleaned.split(/\s+/);

  const isValid =
    cleaned.length >= 3 &&
    validChars.test(cleaned) &&
    words.length >= 2 &&
    words.every((w) => w.length > 1);
  return createSuccessResponse({ valid: isValid });
};

export const POST = withValidatedServices({
  schema: CompanySchema,
  requiredServices: [],
  requireAuth: false,
  handler: postHandler
});
