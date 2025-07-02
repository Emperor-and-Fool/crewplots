# Scheduler Module Aggregation Tasks

This directory contains DataAggregationTask configurations for the scheduler module.

## Purpose
- Define reusable aggregation patterns for scheduling workflows
- Configure data compilation from PostgreSQL, MongoDB, and Redis
- Support ValidationEngine 3.0 integration

## Planned Tasks
- `schedule-block-aggregation.ts` - Complete schedule block data
- `shift-aggregation.ts` - Shift data with requirements and assignments
- `location-schedule-aggregation.ts` - Location-specific scheduling data

## Usage Pattern
```typescript
import { createScheduleBlockAggregationTask } from './aggregation/schedule-block-aggregation';

const task = createScheduleBlockAggregationTask(scheduleId);
const result = await dataAggregationEngine.aggregate(task);
```