import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  variant?: 'default' | 'striped' | 'bordered';
}

const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'divide-y divide-gray-200',
      striped: 'divide-y divide-gray-200',
      bordered: 'border border-gray-200',
    };

    return (
      <div className="overflow-x-auto">
        <table
          className={cn('min-w-full', variants[variant], className)}
          ref={ref}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {}

const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <thead
        className={cn('bg-gray-50', className)}
        ref={ref}
        {...props}
      >
        {children}
      </thead>
    );
  }
);

TableHeader.displayName = 'TableHeader';

interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}

const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <tbody
        className={cn('bg-white divide-y divide-gray-200', className)}
        ref={ref}
        {...props}
      >
        {children}
      </tbody>
    );
  }
);

TableBody.displayName = 'TableBody';

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
}

const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, selected = false, children, ...props }, ref) => {
    return (
      <tr
        className={cn(
          'hover:bg-gray-50 transition-colors',
          selected && 'bg-blue-50',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </tr>
    );
  }
);

TableRow.displayName = 'TableRow';

interface TableHeadProps extends HTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
}

const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, align = 'left', children, ...props }, ref) => {
    const alignments = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    };

    return (
      <th
        className={cn(
          'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
          alignments[align],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </th>
    );
  }
);

TableHead.displayName = 'TableHead';

interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
}

const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align = 'left', children, ...props }, ref) => {
    const alignments = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    };

    return (
      <td
        className={cn(
          'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
          alignments[align],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </td>
    );
  }
);

TableCell.displayName = 'TableCell';

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
export type { TableProps, TableHeaderProps, TableBodyProps, TableRowProps, TableHeadProps, TableCellProps };
