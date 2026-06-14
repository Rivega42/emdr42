import React from 'react';

export interface DataTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableRow {
  id: string;
  [key: string]: React.ReactNode;
}

export interface DataTableProps {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  onRowClick?: (row: DataTableRow) => void;
  empty?: string;
  bare?: boolean;
}

/* Таблица данных дизайн-системы «Лунная ночь» (design/components — .e-table).
   bare — без рамки/тени/радиуса (для встраивания в панель). */
export const DataTable: React.FC<DataTableProps> = ({ columns, rows, onRowClick, empty = 'Записей пока нет', bare = false }) => (
  <div className="e-table-wrap" style={bare ? { border: 'none', boxShadow: 'none', borderRadius: 0 } : undefined}>
    <table className={`e-table${onRowClick ? ' e-table--clickable' : ''}`}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} style={c.align ? { textAlign: c.align } : undefined}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td className="e-table__empty" colSpan={columns.length}>{empty}</td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={row.id}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'link' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} style={c.align ? { textAlign: c.align } : undefined}>{row[c.key]}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
