
## 1. Naming Conventions

TypeScript Naming Conventions Guide

1. General Principles
- Be descriptive but concise
- Avoid abbreviations unless widely understood (id, url, api)
- Consistency over preference
- Use English for all identifiers
- Follow JavaScript/TypeScript standards

2. Case Styles
- camelCase: variables, functions, methods, parameters
- PascalCase: classes, interfaces, types, enums
- UPPER_SNAKE_CASE: constants
- kebab-case: file names

3. Variables
- Use camelCase and meaningful names
Examples:
userName
isActive
totalPrice

4. Functions
- Verb + noun naming
- Boolean functions: is/has/can/should
Examples:
getUserById
isValidEmail
hasPermission

5. Classes
- PascalCase, noun-based
Examples:
UserService
PaymentProcessor

6. Interfaces & Types
- PascalCase, no prefixes
Examples:
interface User {}
type ApiResponse<T> = {}

7. Enums
- PascalCase names, UPPER_SNAKE_CASE values

8. Constants
- UPPER_SNAKE_CASE for global constants
- camelCase for local constants

9. Files & Folders
- kebab-case naming
Examples:
user-service.ts
auth-controller.ts

10. Booleans
- Prefix with is, has, can, should

11. Arrays
- Use plural nouns
Examples:
users
orders

12. Async Functions
- Consistent naming, Async suffix optional

13. Prefix Guidelines
get, set, create, update, delete

14. Private Members
- camelCase, optional underscore prefix

15. Generics
- Use meaningful names or simple letters
Examples:
<T>, <Data>

16. Avoid
- Hungarian notation
- vague names like data, temp, info

Summary
Variables -> camelCase
Functions -> camelCase
Classes -> PascalCase
Interfaces/Types -> PascalCase
Constants -> UPPER_SNAKE_CASE
Files -> kebab-case
Booleans -> is/has/can/should
Arrays -> plural

## 2. Programming Logic

1. DRY Principle (Don't Repeat Yourself)
- Avoid duplicating logic, reuse functions or utilities

Example:
function calculateTax(amount: number): number {
  return amount * 0.12;
}

function calculateTotal(amount: number): number {
  return amount + calculateTax(amount);
}

2. Avoid Spaghetti Code
- Limit nesting
- Use early returns
- Break large functions

Example:
function processOrder(order: Order) {
  if (!order) return;
  if (!order.isPaid) return;

  completeOrder(order);
}

3. Single Responsibility Principle
- One function or class = one responsibility

Example:
function validateUser(user: User): boolean {}
function saveUser(user: User): void {}

4. Use Utility Helpers
- Extract reusable logic

Example:
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

5. Keep Functions Small
- Prefer 5–20 lines
- One clear purpose

6. Avoid Magic Numbers & Strings
- Use named constants

Example:
const TAX_RATE = 0.12;
const MAX_LOGIN_ATTEMPTS = 5;

7. Early Return Pattern
- Handle edge cases first

Example:
function withdraw(amount: number, balance: number) {
  if (amount <= 0) return;
  if (amount > balance) return;

  return balance - amount;
}

8. Avoid Over-Engineering
- Do not introduce unnecessary abstraction

9. Prefer Pure Functions
- Avoid side effects when possible

Example:
function add(a: number, b: number): number {
  return a + b;
}

10. Consistent Error Handling
- Use a unified approach

Example:
function fetchUser(id: string): User {
  if (!id) {
    throw new Error('Invalid user ID');
  }
}

11. Avoid Long Parameter Lists
- Use object parameters

Example:
function createUser(params: {
  name: string;
  email: string;
  age: number;
}) {}

12. Use Composition Over Global State
- Avoid shared mutable globals

13. Code Readability First
- Write clear, maintainable code

Checklist
- No duplicated logic
- Single responsibility
- Easy to read
- Minimal nesting
- Constants extracted

## 3. Testing Guidelines

1. Testing Philosophy
- Test behavior, not implementation
- Focus on what the code does

2. Types of Tests
- Unit Tests: individual functions/classes
- Integration Tests: component interactions
- End-to-End Tests: full application flow

3. Test Naming Convention
- Format: should [expected behavior] when [condition]

Examples:
it('should return user when valid ID is provided', () => {});
it('should throw error when email is invalid', () => {});

4. Arrange–Act–Assert (AAA)
- Arrange: setup data
- Act: execute logic
- Assert: verify output

Example:
it('should calculate total price correctly', () => {
  const items = [{ price: 100 }, { price: 50 }];
  const total = calculateTotal(items);
  expect(total).toBe(150);
});

5. Keep Tests Simple
- One test = one behavior

6. Test Edge Cases
- Invalid inputs
- Empty values
- Boundaries

7. Avoid Implementation Testing
- Do not test private methods or internals
- Test public interfaces only

8. Mock External Dependencies
- Mock APIs, DBs, services

Example:
jest.spyOn(api, 'fetchUser').mockResolvedValue(mockUser);

9. Deterministic Tests
- Avoid randomness and real APIs

10. Meaningful Test Data
Example:
const mockUser = { id: 'user-123', name: 'John Doe' };

11. Test File Structure
- Mirror source structure

12. One Assertion Per Test (preferred)

13. Use Setup Helpers
Example:
function createMockUser() {
  return { id: '1', name: 'Test User' };
}

14. Test Coverage
- Aim for 70–90%

15. Fast Tests
- Keep tests quick

16. Avoid Over-Mocking

Example Full Test:
describe('calculateTotal', () => {
  it('should return correct total when items are provided', () => {
    const items = [{ price: 100 }, { price: 50 }];
    const result = calculateTotal(items);
    expect(result).toBe(150);
  });

  it('should return 0 when no items are provided', () => {
    const result = calculateTotal([]);
    expect(result).toBe(0);
  });
});

Checklist
- Clear test name
- One behavior tested
- Edge cases covered
- Dependencies mocked
- Deterministic
- Easy to read

## 4. Git Management

1. Core Principles
- Use Git strictly for version control and collaboration
- Maintain a clean, readable commit history
- Every commit must be reviewable and attributable
- Prioritize clarity, traceability, and accountability

2. AI Usage Policy
- AI agents MAY manage git: create branches, stage, write commit messages, commit, push and open PRs
- Commit messages follow the standards below whoever writes them; explain what was done and why
- Golden rule (non-negotiable): nothing sensitive is ever committed or pushed (see item 12).
  Before every commit, check the staged diff for credentials, tokens, keys, passwords, .env files,
  databases, session/auth folders and personal data. If in doubt, leave it out and ask.

3. Branch Naming Strategy
- feat/ for new features
- fix/ for bug fixes
- refactor/ for code improvements

Examples:
feat/user-authentication
fix/login-validation-error
refactor/payment-service-cleanup

4. Branch Naming Guidelines
- Use kebab-case
- Keep names short but descriptive

Good Examples:
feat/add-user-registration
fix/cart-total-calculation
refactor/simplify-auth-logic

5. Commit Message Standards
Format:
<type>: <short summary>

<detailed description>

Types:
feat - new functionality
fix - bug fix
refactor - code improvement
chore - maintenance
test - test updates

Example:
feat: add user registration endpoint

Implemented POST /users endpoint for registration.
Includes validation and password hashing.

6. Commit Message Rules
- Use present tense (add, fix, update)
- Keep first line concise
- Add details when necessary

7. Commit Size & Frequency
- Make small, focused commits
- One logical change per commit

8. Avoid Dirty History
- Do not commit debug code or console logs
- Remove unused files before committing

9. Pull Request Guidelines
- Use PRs for all merges
- Include summary, changes, and testing notes

Example:
Summary: Added authentication
Changes:
- Login endpoint
- JWT handling
- Updated service
Testing:
- Added unit tests

10. Branch Lifecycle
- Delete branches after merge

11. Protected Branches
- Protect main branches (master, dev)
- No direct commits, use PRs only

Checklist
- No sensitive data in the staged diff
- Clear and descriptive
- One logical change
- Correct branch naming

Summary
- Use feat/, fix/, refactor/ branches
- Never commit sensitive data
- Write clear, detailed commit descriptions
- Keep commits small and focused
- Use PRs for merging

12. Always add to gitignore sensitive files and folders, nothing should be commited/push pertaining to credentials and other sensitive data, usual folders and files like dependency and build folders should also be added to gitignore

## 5. AI Planning Guidelines

AI Planning Guidelines

1. Purpose
- Define how AI agents create structured plans before code changes
- Ensure clarity, reduce errors, and standardize workflows

2. Plan Types
- Review: Analyze existing code, design, risks, or requirements without code changes
- Implementation: A concrete plan for future or current code changes such as new features, fixes, or refactoring

Important distinction:
- Plan Type describes the kind of work being planned
- Status describes whether the work has actually been done
- An Implementation plan is not the same as implemented code

3. Plan File Location
- /plans directory
- Temporary folder, manually cleaned

4. File Naming Convention
Format:
YYYY-MM-DD-[plan-type]-[short-description].md

Use `review` for analysis-only plans and `implementation` for plans that specify code changes. Do not use the filename alone to imply the work is complete.

5. Plan File Structure
# Plan Details
Date: {{Date/Time}}
Plan Title: {{Title}}
Description: {{Description}}
Plan Type: {{Review or Implementation}}
Status: {{Planned, In Progress, Implemented, Superseded}}

# Low Level Overview of the Plan
Detailed explanation

# File Manifest
List all files created/modified with explanation

# Remarks
Risks, notes, issues

6. Rules
- Always create a plan before coding
- Must define scope and files impacted
- Do not modify files not listed
- Set Status to Planned when the plan is created
- Update Status to Implemented only after the described code changes are complete and verified
- If a plan is replaced by a newer plan, update Status to Superseded
- When reporting to the user, clearly distinguish "plan created" from "implementation completed"

7. File Manifest Rules
- Include all created/modified/deleted files
- Include explanation per file

8. Remarks
- Risks, assumptions, blockers

Summary
- Mandatory planning before changes
- Strict structure required
- Plans stored temporarily in /plans
