import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aqiCategory, type AirQuality } from '@weatherwiz/shared';
import { describe, expect, it, vi } from 'vitest';
import { Segmented } from '@/components/ui/Segmented';
import { AqiCard } from '@/components/weather/AqiCard';
import { WeatherIcon } from '@/components/weather/WeatherIcon';

const air: AirQuality = {
  latitude: 28.6,
  longitude: 77.3,
  time: '2026-09-25T12:00',
  usAqi: 119,
  europeanAqi: 93,
  pm2_5: 21.9,
  pm10: 40.7,
  carbonMonoxide: 345,
  nitrogenDioxide: 8.1,
  ozone: 173,
  sulphurDioxide: 23.8,
  category: aqiCategory(119),
  hourly: [],
};

describe('AqiCard', () => {
  it('shows the index with a text category, not colour alone', () => {
    render(<AqiCard data={air} isLoading={false} onRetry={vi.fn()} />);
    expect(
      screen.getByRole('img', { name: /air quality index 119, unhealthy for sensitive groups/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Unhealthy for sensitive groups')).toBeInTheDocument();
    expect(screen.getByText('PM2.5').nextSibling).toHaveTextContent('21.9');
  });

  it('renders an error state with retry', async () => {
    const onRetry = vi.fn();
    render(<AqiCard isLoading={false} error={new Error('x')} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Air quality unavailable');
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('Segmented', () => {
  it('behaves as a radio group with arrow-key navigation', async () => {
    const onChange = vi.fn();
    render(
      <Segmented
        label="Temperature"
        value="celsius"
        onChange={onChange}
        options={[
          { value: 'celsius', label: '°C' },
          { value: 'fahrenheit', label: '°F' },
        ]}
      />,
    );
    const group = screen.getByRole('radiogroup', { name: 'Temperature' });
    expect(group).toBeInTheDocument();
    const celsius = screen.getByRole('radio', { name: '°C' });
    expect(celsius).toHaveAttribute('aria-checked', 'true');
    celsius.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('fahrenheit');
  });
});

describe('WeatherIcon', () => {
  it('is labelled when meaningful and hidden when decorative', () => {
    const { container } = render(
      <>
        <WeatherIcon icon="thunderstorm" label="Thunderstorm" />
        <WeatherIcon icon="clear" isDay={false} />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Thunderstorm' })).toBeInTheDocument();
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(1);
  });
});
