/** Chart palette (validated categorical slots 1 and 2) per theme. */
export function chartColors(dark: boolean) {
  return dark
    ? {
        series1: '#3987e5',
        series2: '#d95926',
        precip: '#3987e5',
        grid: '#2a354a',
        axis: '#96a2b8',
        surface: '#111827',
        text: '#ecf1f8',
      }
    : {
        series1: '#2a78d6',
        series2: '#eb6834',
        precip: '#2a78d6',
        grid: '#e5e9f0',
        axis: '#586376',
        surface: '#ffffff',
        text: '#0f172a',
      };
}
