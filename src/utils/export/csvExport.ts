/**
 * Converts an array of objects to CSV format
 *
 * @param data Array of objects to convert
 * @param columns Optional column configuration
 * @returns CSV string
 */
export function objectsToCSV<T extends Record<string, any>>(  
  data: T[],
  columns?: {
    key: keyof T;
    header: string;
    format?: (value: any) => string;
  }[]
): string {
  if (!data.length) return '';
  const cols: {
    key: keyof T;
    header: string;
    format?: (value: any) => string;
  }[] =
    columns ||
    (Object.keys(data[0]) as (keyof T)[]).map((key) => ({
      key,
      header: String(key).charAt(0).toUpperCase() + String(key).slice(1),
    }));
  const headerRow = cols.map((c) => `"${c.header}"`).join(',');
  const rows = data.map((item) =>
    cols
      .map((c) => {
        const val = item[c.key];
        const formatted = c.format ? c.format(val) : val;
        return `"${String(formatted ?? '').replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  return [headerRow, ...rows].join('\n');
}
