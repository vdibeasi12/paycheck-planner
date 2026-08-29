// Pages through a Supabase query in fixed-size chunks via .range(), so a
// caller never silently loses rows to PostgREST's default ~1000-row select
// cap the way app/api/admin/events and app/api/admin/visitors used to (QA
// fix, Aug 29 2026). Pass a function that applies .range(from, to) to your
// query -- everything else (filters, .in(), .gte(), etc.) stays in the
// caller, this just repeats the same query with an advancing offset until a
// page comes back short of a full page.
//
// Order by a unique, monotonically-increasing column (e.g. "id"), not
// created_at -- rows sharing an exact created_at timestamp can otherwise
// land on either side of a page boundary and get skipped or duplicated.
export async function fetchAllRows<T>(
  queryPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<{ data: T[]; error: { message: string } | null }> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await queryPage(from, to);
    if (error) return { data: all, error };

    const rows = data || [];
    all.push(...rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return { data: all, error: null };
}
