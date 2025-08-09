import React, { useState, useCallback } from 'react';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Checkbox } from '@/ui/primitives/checkbox';
import { Label } from '@/ui/primitives/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
// Search now goes through backend API route instead of client Supabase
import { SearchPage as HeadlessSearchPage } from '../../headless/search/SearchPage';

interface SearchItem {
  id: string;
  title: string;
  category: string;
  date: string;
}

const SearchPage: React.FC = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const categories = ['report', 'presentation', 'spreadsheet', 'other'];

  const onSearch = useCallback(
    async (query: string) => {
      const resp = await fetch('/api/search/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          categories: selectedCategories,
          startDate: startDate?.toISOString().split('T')[0],
          endDate: endDate?.toISOString().split('T')[0],
        }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Search failed');
      return result.items || [];
    },
    [selectedCategories, startDate, endDate]
  );

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const resetFilters = (setSearchTerm: (v: string) => void) => {
    setSearchTerm('');
    setSelectedCategories([]);
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <HeadlessSearchPage
      onSearch={onSearch}
      render={({ searchTerm, setSearchTerm, results, isLoading, error }) => (
        <div className="p-4 space-y-4">
          <h1 className="text-2xl font-bold">Search</h1>

          <Input
            type="search"
            aria-label="Search box"
            role="searchbox"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />

          <div className="flex flex-wrap gap-4">
            <Card>
              <CardHeader><Label>Category</Label></CardHeader>
              <CardContent className="space-y-2">
                {categories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryChange(category)}
                    />
                    <Label htmlFor={`category-${category}`} className="capitalize">
                      {category}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><Label htmlFor="date-range-start">Date Range</Label></CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label htmlFor="date-range-start">Start Date</Label>
                  <Input
                    type="date"
                    id="date-range-start"
                    aria-label="start date"
                    value={startDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label htmlFor="date-range-end">End Date</Label>
                  <Input
                    type="date"
                    id="date-range-end"
                    aria-label="end date"
                    value={endDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Button variant="outline" onClick={() => resetFilters(setSearchTerm)}>Reset Filters</Button>

          <div className="mt-4">
            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!isLoading && !error && results.length === 0 && <p>No results found.</p>}
            {!isLoading && !error && results.length > 0 && (
              <ul className="space-y-2 list-none p-0">
                {results.map((item: SearchItem) => (
                  <li key={item.id} role="listitem">
                    <Card>
                      <CardHeader><CardTitle>{item.title}</CardTitle></CardHeader>
                      <CardContent>
                        <p>Category: {item.category}</p>
                        <p>Date: {item.date}</p>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    />
  );
};

export default SearchPage;
