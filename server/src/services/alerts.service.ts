import mongoose from 'mongoose';
import {
  MAX_ALERT_RULES,
  evaluateAlertRule,
  type AlertEvaluation,
  type AlertRule as AlertRuleDto,
  type AlertRuleInput,
} from '@weatherwiz/shared';
import { AppError, limitReached, notFound } from '../lib/errors';
import { AlertRule, toAlertRuleDto } from '../models/AlertRule';
import type { WeatherService } from './weather.service';

export async function listRules(userId: string): Promise<AlertRuleDto[]> {
  const docs = await AlertRule.find({ userId }).sort({ createdAt: 1 });
  return docs.map(toAlertRuleDto);
}

export async function createRule(userId: string, input: AlertRuleInput): Promise<AlertRuleDto> {
  const count = await AlertRule.countDocuments({ userId });
  if (count >= MAX_ALERT_RULES)
    throw limitReached(`You can create up to ${MAX_ALERT_RULES} alert rules`);
  const doc = await AlertRule.create({ ...input, userId, enabled: input.enabled ?? true });
  return toAlertRuleDto(doc);
}

export async function setRuleEnabled(
  userId: string,
  id: string,
  enabled: boolean,
): Promise<AlertRuleDto> {
  if (!mongoose.isValidObjectId(id)) throw notFound('Alert rule not found');
  const doc = await AlertRule.findOneAndUpdate(
    { _id: id, userId },
    { $set: { enabled } },
    { new: true },
  );
  if (!doc) throw notFound('Alert rule not found');
  return toAlertRuleDto(doc);
}

export async function deleteRule(userId: string, id: string): Promise<void> {
  if (!mongoose.isValidObjectId(id)) throw notFound('Alert rule not found');
  const res = await AlertRule.deleteOne({ _id: id, userId });
  if (res.deletedCount === 0) throw notFound('Alert rule not found');
}

/**
 * Evaluates all enabled rules on request. Forecasts come through the cache,
 * so rules for the same place share one upstream call.
 */
export async function evaluateRules(
  userId: string,
  weather: WeatherService,
): Promise<AlertEvaluation> {
  const rules = (await listRules(userId)).filter((r) => r.enabled);
  const results = await Promise.allSettled(
    rules.map(async (rule) => {
      const { value } = await weather.forecast(rule.latitude, rule.longitude);
      return evaluateAlertRule(rule, value);
    }),
  );
  const evaluation: AlertEvaluation = {
    evaluatedAt: new Date().toISOString(),
    triggered: [],
    errors: [],
  };
  results.forEach((result, i) => {
    const rule = rules[i]!;
    if (result.status === 'fulfilled') {
      if (result.value) evaluation.triggered.push(result.value);
    } else {
      evaluation.errors.push({
        ruleId: rule.id,
        message: result.reason instanceof AppError ? result.reason.message : 'Evaluation failed',
      });
    }
  });
  return evaluation;
}
