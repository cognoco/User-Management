### General Principles

- **Modular & Pluggable:**  
  Build the app as a standalone, modular block that can be easily integrated into any web or mobile application. All non-core features must be easy to enable/disable for different host apps.

- **Database Agnostic:**  
  While Supabase is currently used, all code must be cleanly separated and easy to adapt to other databases in the future.

- **Separation of Concerns:**  
  Keep frontend and backend code strictly separated.

- **Code Quality:**  
  All changes must make the app more robust and production-ready. Never introduce fixes that solve one problem but create others.

- **Change Management:**  
  Only change one functionality at a time, then pause for user review before proceeding (except when fixing all issues within a single test file or suite).

- **File & Reference Hygiene:**  
  - Before creating or moving any file, check the entire codebase (including all subfolders) to avoid duplicates.
  - If a file is referenced but missing, search for it elsewhere before creating a new one.
  - Remove or update references to the old `/project` directory, as all code now resides in the root.
  - **When creating any new file (not just for testing), strictly follow the conventions in `docs/File structure guidelines.md`.**


- **Tech Stack:**  
  Use only the established stack (Next.js, TypeScript, React, Supabase, Zustand, Tailwind CSS, Shadcn UI, Vitest, React Testing Library, User Event, MSW, JSDOM, Testing Library Jest DOM). Ask before introducing new technologies.

ALWAYS MUST READ: 
docs\Product documentation\Architecture Guidelines.md
docs\Product documentation\Architecture Rules References.md
docs\Project documentation\thorough-review-of-codebase.md
docs\Project documentation\GAP_ANALYSIS.md
docs\Project documentation\Tasks\IMPLEMENTATION_PLAN.md

Please do not run tests after you are finished with the coding unless you are specifically asked to. If you are asked to run tests, continue reading: 
 
  ### Testing Rules
Do not reduce the test scope for existing test or simplify the tests so that they no longer mirror the real implemenation.  The tests are there to find bugs, not to pass by all means! 

FOR E2E tests - THESE TESTS ARE MADE TO DISCOVER BUGS. DO NOT FIX A TEST IF UI/API/HOOK or some other functionality is missing! Keep them as close to reality and avoid mockings where possilble. DO not fix the test so that it passes when it points to missing/wrong implementation. 
Before you run the E2E for any feature, first read the expected implementation that is described in one of the relevant files under docs/Product documentation/functionality-features-phase...
Find the correct file and identify the relevant end user flows and features. Then read the full application implementation and ensure that all expected features are covered. If not - expand the implementation! 
After this read the test file and ensure all tests are there and cover all expected features and flows. If not, expand the file. 
Read file called TESTING ISSUES-E2E
Only then run the test suite. 
Be aware that a lot of the ui is missing and if the test fails it might be a real bug. 
Dont run the whole test file after each change. Run only the failing tests you are trying to fix - you can only run for separate browsers. Some of the full test files are large and take long time to run. Only run them at important points - once you believe they should all pass or if you are not sure if you broke some. At the end of each bug fixing run the full test file. It is your responsibility to fix these tests so that they are passing. Run the test, continue debugging and then run again until all tests in the file pass. 
You dont have to update the user with bugs/issues etc, but update the user once all tests in the file are passing. Skipped test count as failed unless there is a very good reason that they are skipped. 
Never run the whole E2E suite.
Once all tests in the file you are working on are passing update the documentation in TESTING ISSUES-E2E if you encountered some issues that can be relevant for future bug fixing. 

Command examples:
To run the whole file: 
 npx playwright test e2e/auth/registration.spec.ts 
 to run one test: 
 npx playwright test e2e/auth/registration.spec.ts --grep="should disable submit button when form is invalid|should show error for invalid email format"
To run one type of browser:
npx playwright test e2e/auth/registration.spec.ts:219 --project="Desktop Chrome" --headed

To run integration tests: ## Testing
- Use `vitest run --coverage`.
- All changed files must reach ≥ 90 % branch coverage.
