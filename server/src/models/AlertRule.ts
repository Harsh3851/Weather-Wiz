import { Schema, model } from 'mongoose';
import type { AlertRule as AlertRuleDto } from '@weatherwiz/shared';

const alertRuleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    locationName: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    metric: {
      type: String,
      required: true,
      enum: [
        'precipitationProbability',
        'precipitationSum',
        'temperatureMax',
        'temperatureMin',
        'windSpeedMax',
        'uvIndexMax',
      ],
    },
    operator: { type: String, required: true, enum: ['gt', 'lt'] },
    threshold: { type: Number, required: true },
    day: { type: String, required: true, enum: ['today', 'tomorrow'] },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

export const AlertRule = model('AlertRule', alertRuleSchema);

interface AlertRuleLike {
  id?: unknown;
  locationName: string;
  latitude: number;
  longitude: number;
  metric: string;
  operator: string;
  threshold: number;
  day: string;
  enabled: boolean;
  createdAt: Date;
}

export function toAlertRuleDto(doc: AlertRuleLike): AlertRuleDto {
  return {
    id: doc.id as string,
    locationName: doc.locationName,
    latitude: doc.latitude,
    longitude: doc.longitude,
    metric: doc.metric as AlertRuleDto['metric'],
    operator: doc.operator as AlertRuleDto['operator'],
    threshold: doc.threshold,
    day: doc.day as AlertRuleDto['day'],
    enabled: doc.enabled,
    createdAt: doc.createdAt.toISOString(),
  };
}
