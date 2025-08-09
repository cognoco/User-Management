export const runtime = 'nodejs';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/middleware/rate-limit';

// Schema for the address components expected by this endpoint
const AddressValidationRequestSchema = z.object({
  addressLines: z.array(z.string()), // e.g., ["1600 Amphitheatre Pkwy", "Suite 100"]
  regionCode: z.string().length(2),    // ISO 3166-1 alpha-2 country code (e.g., "US")
  locality: z.string().optional(),     // City/Town (e.g., "Mountain View")
  administrativeArea: z.string().optional(), // State/Province (e.g., "CA")
  postalCode: z.string().optional(),   // Postal Code (e.g., "94043")
  // languageCode: z.string().optional(), // Optional: e.g., "en"
});

type AddressValidationRequest = z.infer<typeof AddressValidationRequestSchema>;

// Define expected structure for Google API request
// See: https://developers.google.com/maps/documentation/address-validation/reference/rest/v1/TopLevel/validateAddress
interface GoogleValidationRequest {
  address: {
    regionCode: string;
    // languageCode?: string;
    postalCode?: string;
    administrativeArea?: string;
    locality?: string;
    addressLines: string[];
  };
  // enableUspsCass?: boolean; // Optional for US addresses
}

// Simplified expected structure of Google API response
interface GoogleValidationResponse {
  result?: {
    verdict?: {
      addressComplete?: boolean;
      hasUnconfirmedComponents?: boolean;
      hasInferredComponents?: boolean;
    };
    address?: {
      formattedAddress?: string;
      postalAddress?: unknown;
      addressComponents?: unknown[];
    };
      geocode?: unknown;
      metadata?: unknown;
      uspsData?: unknown;
  };
  responseId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Rate Limiting (Consider stricter limits for external API calls)
  const isRateLimited = await checkRateLimit(request);
  if (isRateLimited) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // 2. Get Google API Key from environment variables
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY environment variable is not set.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  try {
    // 3. Authentication (Optional but recommended if this isn't public)
    // Add user authentication check here if needed

    // 4. Parse and Validate Request Body
    let body: AddressValidationRequest;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const parseResult = AddressValidationRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: parseResult.error.format() 
      }, { status: 400 });
    }

    // 5. Prepare Google API Request Payload
    const googlePayload: GoogleValidationRequest = {
      address: {
        regionCode: parseResult.data.regionCode,
        addressLines: parseResult.data.addressLines,
        ...(parseResult.data.locality && { locality: parseResult.data.locality }),
        ...(parseResult.data.administrativeArea && { administrativeArea: parseResult.data.administrativeArea }),
        ...(parseResult.data.postalCode && { postalCode: parseResult.data.postalCode }),
      }
    };

    // 6. Call Google Address Validation API
    const googleApiUrl = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`;
    let googleResponseData: GoogleValidationResponse = {};
    let fetchError: string | null = null;

    try {
        console.warn('Calling Google Address Validation API...');
        const response = await fetch(googleApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(googlePayload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Google API error: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        googleResponseData = await response.json();
        console.warn('Google API response received.');

    } catch (error: unknown) {
        console.error('Error calling Google Address Validation API:', error);
        fetchError = error instanceof Error ? error.message : 'Failed to call validation service.';
    }

    // 7. Process Response and Determine Status
    let isValid = false;
    let message = 'Validation check completed.';
    let suggestions = null as unknown; // Will hold parsed address suggestions if available

    if (fetchError) {
        isValid = false;
        message = fetchError;
    } else if (googleResponseData.result?.verdict) {
        const verdict = googleResponseData.result.verdict;
        // Basic check: addressComplete and no unconfirmed/inferred components
        // You might adjust this logic based on your specific requirements
        if (verdict.addressComplete && !verdict.hasUnconfirmedComponents && !verdict.hasInferredComponents) {
            isValid = true;
            message = 'Address appears valid.';
        } else if (verdict.hasUnconfirmedComponents || verdict.hasInferredComponents) {
            isValid = false; // Consider it invalid if components are unsure/added
            message = 'Address is ambiguous or requires corrections.';
            // Parse suggestions from the response if address components are provided
            const components =
                (googleResponseData.result as any)?.address?.addressComponents ??
                (googleResponseData.result as any)?.geocode?.address_components;
            if (Array.isArray(components)) {
                suggestions = components.map((component: any) => ({
                    type: component.componentType || component.types?.[0],
                    long_name: component.componentName?.text ?? component.long_name,
                    short_name: component.componentName?.shortText ?? component.short_name
                }));
            } else {
                suggestions = googleResponseData.result.address;
            }
        } else {
            isValid = false;
            message = 'Address validation inconclusive or incomplete.';
        }
    } else {
        isValid = false;
        message = 'Validation service did not return a conclusive verdict.';
    }

    // 8. Return Result to Frontend
    return NextResponse.json({
        isValid: isValid,
        message: message,
        suggestions: suggestions 
    });

  } catch (error: unknown) {
    console.error('Unexpected error in POST /api/address/validate:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
