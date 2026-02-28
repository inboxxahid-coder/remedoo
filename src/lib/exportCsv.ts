export function exportToCsv(filename: string, rows: Record<string, any>[], columns?: string[]) {
  if (!rows.length) return;
  const keys = columns || Object.keys(rows[0]);
  const header = keys.join(",");
  const csv = [
    header,
    ...rows.map(row =>
      keys.map(k => {
        const val = row[k] ?? "";
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
