import { render, screen } from '@/tests/utils/test-utils';
import { DataTable } from '../DataTable';

const data = [{ id: 1, name: 'A' }];
const columns = [{ key: 'id', header: 'ID', sortable: true }, { key: 'name', header: 'Name' }];

describe('DataTable accessibility', () => {
  it('adds aria-sort on sortable headers', () => {
    render(<DataTable data={data} columns={columns} />);
    const header = screen.getByRole('columnheader', { name: 'ID' });
    expect(header).toHaveAttribute('aria-sort', 'none');
  });
});
