import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent } from '@/ui/primitives/card';
import { ChevronDown, ChevronUp, Search, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/ui/primitives/dropdown-menu';
import DataTableHeadless, {
  type DataTableProps as HeadlessProps,
  type Column as HeadlessColumn,
} from '@/ui/headless/common/DataTable';

interface Column<T> extends HeadlessColumn<T> {
  render?: (value: any, record: T) => React.ReactNode;
}

interface DataTableProps<T> extends Omit<HeadlessProps<T>, 'render'> {
  rowActions?: (record: T) => React.ReactNode;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  rowActions,
  emptyMessage = 'No data available',
  cardView: forceCardView = false,
}: DataTableProps<T>) {
  return (
    <DataTableHeadless
      data={data}
      columns={columns}
      searchable={searchable}
      cardView={forceCardView}
      render={({
        searchTerm,
        setSearchTerm,
        sortConfig,
        handleSort,
        filteredData,
        useCardView,
        getVisibleColumns,
        getPrimaryColumn
      }) => {
        const SearchInput = () => (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        );

        if (filteredData.length === 0) {
          return (
            <div className="space-y-4">
              {searchable && <SearchInput />}
              <div className="text-center p-8 border border-dashed rounded-md">
                <p className="text-muted-foreground">{emptyMessage}</p>
              </div>
            </div>
          );
        }

        const renderCardView = () => (
          <div className="grid grid-cols-1 gap-4">
            {filteredData.map((row, rowIndex) => {
              const primaryColumn = getPrimaryColumn();
              const primaryValue = (primaryColumn as Column<T>).render
                ? (primaryColumn as Column<T>).render!(row[primaryColumn.key], row)
                : row[primaryColumn.key]?.toString();
              return (
                <Card key={rowIndex} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 bg-muted/20 border-b flex justify-between items-center">
                      <div className="font-medium">{primaryValue}</div>
                      {rowActions && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {rowActions(row)}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      {columns
                        .filter(col => col.key !== primaryColumn.key)
                        .map((column) => {
                          const col = column as Column<T>;
                          const cellValue = col.render
                            ? col.render(row[column.key], row)
                            : row[column.key]?.toString() || '-';
                          return (
                            <div key={String(column.key)} className="grid grid-cols-2 gap-2">
                              <div className="text-sm font-medium text-muted-foreground">
                                {column.header}:
                              </div>
                              <div className="text-sm">{cellValue}</div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );

        const renderTableView = () => (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {getVisibleColumns().map((column) => (
                    <TableHead
                      key={String(column.key)}
                      aria-sort={
                        sortConfig?.key === column.key
                          ? sortConfig.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      {column.sortable ? (
                        <Button
                          variant="ghost"
                          onClick={() => handleSort(column.key)}
                          className="flex items-center space-x-2 h-auto p-2 font-medium"
                        >
                          <span>{column.header}</span>
                          {sortConfig?.key === column.key && (
                            sortConfig.direction === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )
                          )}
                        </Button>
                      ) : (
                        column.header
                      )}
                    </TableHead>
                  ))}
                  {rowActions && <TableHead className="w-[80px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row, rowIndex) => (
                  <TableRow key={rowIndex} tabIndex={0}>
                    {getVisibleColumns().map((column) => {
                      const col = column as Column<T>;
                      const cellValue = col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]?.toString() || '-';
                      return <TableCell key={String(col.key)}>{cellValue}</TableCell>;
                    })}
                    {rowActions && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {rowActions(row)}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

        return (
          <div className="space-y-4">
            {searchable && <SearchInput />}
            {useCardView ? renderCardView() : renderTableView()}
          </div>
        );
      }}
    />
  );
}

export default DataTable;
