import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GeoLocation } from '@weatherwiz/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchBox } from '@/components/SearchBox';
import { renderWithQuery } from './utils';

const geocode = vi.fn<(q: string) => Promise<GeoLocation[]>>();

vi.mock('@/lib/services', () => ({
  weatherService: { geocode: (q: string) => geocode(q) },
}));

const city = (name: string, admin1: string, lat: number): GeoLocation => ({
  id: lat,
  name,
  latitude: lat,
  longitude: 77,
  country: 'India',
  countryCode: 'IN',
  admin1,
  timezone: 'Asia/Kolkata',
  population: null,
});

describe('SearchBox', () => {
  beforeEach(() => {
    geocode.mockReset();
    geocode.mockResolvedValue([
      city('Noida', 'Uttar Pradesh', 28.58),
      city('Noida Extension', 'Uttar Pradesh', 28.6),
    ]);
  });

  it('debounces input and lists matching cities', async () => {
    const user = userEvent.setup();
    renderWithQuery(<SearchBox onSelect={vi.fn()} />);
    const input = screen.getByRole('combobox', { name: /search for a city/i });

    await user.type(input, 'Noi');
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Noida');
    // One request for the settled term, not one per keystroke.
    expect(geocode).toHaveBeenCalledTimes(1);
    expect(geocode).toHaveBeenCalledWith('Noi');
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('supports keyboard navigation and selection', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithQuery(<SearchBox onSelect={onSelect} />);
    const input = screen.getByRole('combobox');

    await user.type(input, 'Noida');
    await screen.findAllByRole('option');
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[1]!.id);

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Noida Extension', latitude: 28.6 }),
    );
    expect(input).toHaveValue('');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderWithQuery(<SearchBox onSelect={vi.fn()} />);
    const input = screen.getByRole('combobox');
    await user.type(input, 'Noida');
    await screen.findAllByRole('option');
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows an empty state when nothing matches', async () => {
    geocode.mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithQuery(<SearchBox onSelect={vi.fn()} />);
    await user.type(screen.getByRole('combobox'), 'zzzz');
    expect(await screen.findByText(/No places match/)).toBeInTheDocument();
  });

  it('shows recent searches when the input is empty', async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <SearchBox
        onSelect={vi.fn()}
        recents={[
          {
            id: 'r1',
            name: 'Mumbai',
            country: 'India',
            countryCode: 'IN',
            admin1: 'Maharashtra',
            latitude: 19.07,
            longitude: 72.88,
            searchedAt: new Date().toISOString(),
          },
        ]}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox', { name: /recent searches/i })).toBeInTheDocument();
    expect(screen.getByRole('option')).toHaveTextContent('Mumbai');
    await waitFor(() => expect(geocode).not.toHaveBeenCalled());
  });
});
