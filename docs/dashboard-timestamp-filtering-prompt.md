# Dashboard AI Prompt: Timestamp Filtering and Sorting

You are implementing the dashboard data layer and table UX for the CIRS frontend.

## Goal
Add filtering and sorting support for latest and recently updated records using new API query capabilities based on `createdAt` and `updatedAt`.

## API Behavior
List endpoints support these query params:
- `page` (number)
- `pageSize` (number)
- `sortBy` (`createdAt` or `updatedAt`)
- `sortOrder` (`asc` or `desc`)
- `createdFrom` (ISO datetime)
- `createdTo` (ISO datetime)
- `updatedFrom` (ISO datetime)
- `updatedTo` (ISO datetime)

Default server behavior:
- `sortBy` defaults to `createdAt`
- `sortOrder` defaults to `desc`

Pagination behavior:
- If `page` or `pageSize` is provided, API returns:
  - `{ data: [...], pagination: {...} }`
- If both are omitted, API returns a plain array.

## Endpoints to Wire
Use the same query model across these dashboard tables:
- `/api/v1/admin/users`
- `/api/v1/users`
- `/api/v1/citizens`
- `/api/v1/agencies`
- `/api/v1/responders`
- `/api/v1/statuses`
- `/api/v1/categories`
- `/api/v1/severities`
- `/api/v1/locations`
- `/api/v1/incidents`
- `/api/v1/assignments`

## UX Requirements
Implement these quick filters for each table. **`Latest` must be the active default on every initial page load**:
- `Latest` *(default active)*: `sortBy=createdAt&sortOrder=desc`
- `Recently Updated`: `sortBy=updatedAt&sortOrder=desc`
- `Oldest`: `sortBy=createdAt&sortOrder=asc`

Add date range controls:
- Created date range:
  - `createdFrom`
  - `createdTo`
- Updated date range:
  - `updatedFrom`
  - `updatedTo`

## Technical Requirements
1. Create a reusable query-state model for all list pages.
2. Persist filter state in URL query params for shareable views.
3. Debounce date filter changes before requesting.
4. Reset page to `1` whenever filters or sort change.
5. Show active filter chips and allow one-click clear.
6. Use loading skeletons and empty states with clear copy.
7. Handle both response shapes safely:
   - paginated object
   - legacy array

## Default Fetch Behavior
On initial load (no user interaction), every dashboard table must fetch the latest records:
- Always initialize with `sortBy=createdAt` and `sortOrder=desc`.
- Do **not** wait for user action — apply these defaults at query construction time.
- When building the initial query state, pre-populate `sortBy: 'createdAt'` and `sortOrder: 'desc'` so the first API call always returns the newest records first.

```ts
// Default query state — always start with latest
const defaultQuery: ListQueryState = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};
```

## Suggested Query Builder
Build requests from a typed object with these defaults applied at initialization:
- `page?: number` — default `1`
- `pageSize?: number` — default `20`
- `sortBy?: 'createdAt' | 'updatedAt'` — **default `'createdAt'`**
- `sortOrder?: 'asc' | 'desc'` — **default `'desc'`**
- `createdFrom?: string`
- `createdTo?: string`
- `updatedFrom?: string`
- `updatedTo?: string`

Always include `sortBy` and `sortOrder` in every request (never omit them, even when using server defaults) so behavior is explicit and predictable.

## Acceptance Criteria
- **On initial load, every table renders the latest records first (newest `createdAt` at the top) without any user interaction.**
- The "Latest" quick-filter button is visually active by default.
- User can switch between Latest and Recently Updated views instantly.
- User can constrain by created and updated date ranges.
- Table order matches API sort exactly.
- Pagination metadata is honored when returned.
- URL reflects current filter/sort/page state.
- Refresh preserves selected filters and sort.

## Deliverables
- Reusable list-query hook or composable.
- Updated data-fetching service with timestamp query support.
- Updated table toolbar/filter UI.
- Unit tests for query serialization.
- Component/integration tests for sort and date-range interactions.
