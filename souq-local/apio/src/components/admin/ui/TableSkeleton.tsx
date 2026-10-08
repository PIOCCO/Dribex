type Props = { rows?: number; cols?: number };

export default function TableSkeleton({ rows = 5, cols = 6 }: Props) {
  return (
    <div className="admin-table-wrap" aria-hidden>
      <table className="admin-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <div className="admin-skeleton h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <div className={`admin-skeleton h-4 ${c === 0 ? "w-32" : "w-24"}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
