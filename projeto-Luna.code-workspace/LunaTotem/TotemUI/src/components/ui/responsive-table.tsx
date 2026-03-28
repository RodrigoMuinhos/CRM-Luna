"use client";

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
};

type ResponsiveTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  rowKey?: (row: T) => string | number;
  // Optional custom mobile card renderer — if provided, it's used for the mobile stacked view
  cardRenderer?: (row: T) => React.ReactNode;
  className?: string;
};

export function ResponsiveTable<T>({ data, columns, rowKey, cardRenderer, className }: ResponsiveTableProps<T>) {
  const getRowKey = (row: T, index: number) => (rowKey ? rowKey(row) : (index as number));

  return (
    <div className={className}>
      {/* Desktop / tablet table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className="px-6 py-3 text-left text-sm text-gray-500">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell className="px-6 py-8 text-center text-gray-500" colSpan={columns.length as any}>
                  Nenhum registro
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow key={String(getRowKey(row, i))} className="border-b border-gray-50 hover:bg-gray-50">
                  {columns.map((col) => (
                    <TableCell key={col.key} className="px-6 py-4 text-sm text-gray-700 align-middle">
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-3">
        {data.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500">Nenhum registro</div>
        ) : (
          data.map((row, i) => (
            <div key={String(getRowKey(row, i))} className="bg-white border rounded-lg p-3 shadow-sm">
              {/* Custom mobile view preferred */}
              {cardRenderer ? (
                cardRenderer(row)
              ) : (
                <div className="space-y-2 text-sm text-gray-700">
                  {columns.map((col) => (
                    <div key={col.key} className="flex justify-between items-start gap-3">
                      <div className="text-xs text-gray-400 pr-3 w-1/3">{col.header}</div>
                      <div className="flex-1 text-sm text-gray-800">{col.cell(row)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ResponsiveTable;
