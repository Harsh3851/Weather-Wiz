import type { AqiCategory } from './types';

/** US EPA AQI breakpoints (0-500). */
const CATEGORIES: { max: number; category: AqiCategory }[] = [
  {
    max: 50,
    category: { key: 'good', label: 'Good', advice: 'Air quality is satisfactory.' },
  },
  {
    max: 100,
    category: {
      key: 'moderate',
      label: 'Moderate',
      advice: 'Unusually sensitive people should limit prolonged outdoor exertion.',
    },
  },
  {
    max: 150,
    category: {
      key: 'sensitive',
      label: 'Unhealthy for sensitive groups',
      advice: 'Children, older adults and people with lung disease should reduce exertion.',
    },
  },
  {
    max: 200,
    category: {
      key: 'unhealthy',
      label: 'Unhealthy',
      advice: 'Everyone should reduce prolonged or heavy outdoor exertion.',
    },
  },
  {
    max: 300,
    category: {
      key: 'very-unhealthy',
      label: 'Very unhealthy',
      advice: 'Avoid outdoor exertion; consider moving activities indoors.',
    },
  },
  {
    max: Number.POSITIVE_INFINITY,
    category: {
      key: 'hazardous',
      label: 'Hazardous',
      advice: 'Health warning of emergency conditions. Stay indoors.',
    },
  },
];

export function aqiCategory(usAqi: number | null | undefined): AqiCategory | null {
  if (typeof usAqi !== 'number' || Number.isNaN(usAqi) || usAqi < 0) return null;
  return CATEGORIES.find((c) => usAqi <= c.max)!.category;
}
