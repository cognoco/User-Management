import { render, screen } from '@/tests/utils/test-utils';
import { DataTable } from '../DataTable';

interface Row { id: number; name: string; }

const data = [{ id: 1, name: 'A' }];
const columns: { key: keyof Row; header: string; sortable?: boolean }[] = [{ key: 'id', header: 'ID', sortable: true }, { key: 'name', header: 'Name' }];

describe('DataTable accessibility', () => {
  it('adds aria-sort on sortable headers', () => {
    render(<DataTable data={data} columns={columns} />);
    const header = screen.getByRole('columnheader', { name: 'ID' });
    expect(header).toHaveAttribute('aria-sort', 'none');
  });
});
