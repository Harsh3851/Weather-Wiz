import { IS_DEMO } from '../config';
import { apiUserDataService } from './apiUserData';
import { apiWeatherService } from './apiWeather';
import { demoWeatherService } from './demoWeather';
import { createLocalUserDataService } from './localUserData';
import type { UserDataService, WeatherService } from './types';

export type { UserDataService, WeatherService } from './types';

export const weatherService: WeatherService = IS_DEMO ? demoWeatherService : apiWeatherService;
export const localUserDataService: UserDataService = createLocalUserDataService(weatherService);
export { apiUserDataService };
