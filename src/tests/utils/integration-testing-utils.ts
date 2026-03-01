// __tests__/utils/integration-testing-utils.ts

import { render, screen, waitFor, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { supabase } from '@/lib/database/supabase';
import { vi, type Mock } from 'vitest';
import type { ReactElement } from 'react';

interface IntegrationTestOptions {
  initialRoute?: string;
  authUser?: Record<string, unknown> | null;
  mockData?: Record<string, unknown[] | Record<string, unknown>>;
}

interface StepEnv {
  user: ReturnType<typeof userEvent.setup>;
  renderComponent: (ui: ReactElement, renderOptions?: RenderOptions) => ReturnType<typeof render> & {
    user: ReturnType<typeof userEvent.setup>;
    waitForReady: () => Promise<void>;
  };
  simulateUserFlow: (actions: Array<(user: ReturnType<typeof userEvent.setup>) => Promise<void>>) => Promise<void>;
  results: Record<string, unknown>;
  stepIndex: number;
}

type FlowStep = ((testEnv: StepEnv) => Promise<Record<string, unknown> | void>) & { displayName?: string };

/**
 * Creates a testing environment for integration tests
 */
export function setupIntegrationTest(options: IntegrationTestOptions = {}) {
  const {
    initialRoute = '/',
    authUser = null,
    mockData = {}
  } = options;
  
  // Set up authentication mocks
  const getUserMock = supabase.auth.getUser as unknown as Mock;
  if (authUser) {
    getUserMock.mockResolvedValue({
      data: { user: authUser },
      error: null
    });
  } else {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null
    });
  }
  
  // Set up data mocks
  setupDataMocks(mockData);
  
  // Initialize user event
  const user = userEvent.setup();
  
  return {
    user,
    /**
     * Renders a component for integration testing
     */
    renderComponent: (ui: ReactElement, renderOptions: RenderOptions = {}) => {
      const result = render(ui, renderOptions);
      return {
        ...result,
        user,
        // Helper to wait for all loading indicators to disappear
        waitForReady: () => waitFor(() => {
          const loadingElements = [
            ...screen.queryAllByRole('progressbar'),
            ...screen.queryAllByText(/loading/i),
            ...screen.queryAllByLabelText(/loading/i)
          ];
          if (loadingElements.length > 0) {
            throw new Error('Still loading');
          }
        })
      };
    },
    // Add function to simulate user actions in sequence
    simulateUserFlow: async (actions: Array<(user: ReturnType<typeof userEvent.setup>) => Promise<void>>) => {
      for (const action of actions) {
        await action(user);
      }
    }
  };
}

/**
 * Sets up data mocks for database tables
 */
function setupDataMocks(mockData: Record<string, unknown[] | Record<string, unknown>>) {
  const fromMock = supabase.from as unknown as Mock;
  for (const [table, data] of Object.entries(mockData)) {
    fromMock.mockImplementation((requestedTable: string) => {
      if (requestedTable === table) {
        return createTableMock(data);
      }
      // Default mock for other tables
      return createTableMock([]);
    });
  }
}

/**
 * Creates a mock for a database table
 */
function createTableMock(data: unknown[] | Record<string, unknown>): Record<string, unknown> {
  // Handle both array and single object data
  const mockData = Array.isArray(data) ? data : [data];
  
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    update: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    upsert: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    delete: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ 
      data: Array.isArray(data) ? data[0] : data, 
      error: null 
    }),
    // Add filtering capability for integration tests
    filter: (field: string, operator: string, value: unknown) => {
      // Filter the data based on criteria
      const filteredData = (mockData as Record<string, unknown>[]).filter((item) => {
        if (operator === 'eq') return item[field] === value;
        if (operator === 'gt') return item[field] as number > (value as number);
        if (operator === 'lt') return item[field] as number < (value as number);
        if (operator === 'in') return (value as unknown[]).includes(item[field]);
        return true;
      });
      
      return {
        ...createTableMock(filteredData),
        data: filteredData,
        then: (callback: (result: { data: unknown[]; error: null }) => unknown) => 
          Promise.resolve(callback({ data: filteredData, error: null }))
      };
    },
    // Allow chaining with promises for async/await
    then: (callback: (result: { data: unknown[]; error: null }) => unknown) => 
      Promise.resolve(callback({ data: mockData, error: null }))
  };
}

/**
 * Tests a complete user flow across multiple components
 */
export async function testUserFlow(steps: FlowStep[], options: IntegrationTestOptions = {}) {
  const testEnv = setupIntegrationTest(options);
  const results: Record<string, unknown> = {};
  
  // Run each step in sequence
  for (const [index, step] of steps.entries()) {
    const stepResult = await step({
      ...testEnv,
      results,
      stepIndex: index
    });
    
    if (stepResult) {
      Object.assign(results, stepResult);
    }
  }
  
  return results;
}

/**
 * Creates a step for a user flow test
 */
export function createFlowStep(name: string, action: (testEnv: StepEnv) => Promise<Record<string, unknown> | void>): FlowStep {
  const step: FlowStep = async (testEnv: StepEnv) => {
    console.log(`Running step: ${name}`);
    return action(testEnv);
  };
  
  step.displayName = name;
  return step;
}

interface SubmitFormOptions {
  formTestId?: string;
  fields?: Record<string, string>;
  submitButtonText?: string;
  waitForResponse?: boolean;
}

/**
 * Simulates form submission in integration tests
 */
export function submitForm(options: SubmitFormOptions) {
  const {
    formTestId = 'form',
    fields = {},
    submitButtonText = 'Submit',
    waitForResponse = true
  } = options;
  
  return createFlowStep('Submit Form', async ({ user }: StepEnv) => {
    // Find the form
    const form = screen.getByTestId(formTestId);
    
    // Fill in fields
    for (const [fieldName, value] of Object.entries(fields)) {
      const field = screen.getByLabelText(fieldName) || screen.getByTestId(`field-${fieldName}`);
      await user.clear(field);
      await user.type(field, value);
    }
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: submitButtonText });
    await user.click(submitButton);
    
    // Wait for response if requested
    if (waitForResponse) {
      await waitFor(() => {
        const loading = screen.queryByText(/loading/i);
        if (loading) {
          throw new Error('Still loading');
        }
      });
    }
  });
}
