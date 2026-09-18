export * from './types';
export * from './builder';
export * from './layered-architecture';
export * from './two-domain';
export * from './food-delivery';
export * from './hub-heavy';
export * from './bridge-heavy';
export * from './test-heavy';
export * from './field-heavy';
export * from './trigger-handler';
export * from './disconnected-components';
export * from './long-chain';
export * from './dense-cross-domain';
export * from './sparse-graph';
export * from './scale-100-plus';

import { createLayeredArchitectureFixture } from './layered-architecture';
import { createTwoDomainFixture } from './two-domain';
import { createFoodDeliveryFixture } from './food-delivery';
import { createHubHeavyFixture } from './hub-heavy';
import { createBridgeHeavyFixture } from './bridge-heavy';
import { createTestHeavyFixture } from './test-heavy';
import { createFieldHeavyFixture } from './field-heavy';
import { createTriggerHandlerFixture } from './trigger-handler';
import { createDisconnectedComponentsFixture } from './disconnected-components';
import { createLongChainFixture } from './long-chain';
import { createDenseCrossDomainFixture } from './dense-cross-domain';
import { createSparseGraphFixture } from './sparse-graph';
import { createScale100PlusFixture } from './scale-100-plus';

export const ALL_BENCHMARK_FIXTURES = [
  createLayeredArchitectureFixture(),
  createTwoDomainFixture(),
  createFoodDeliveryFixture(),
  createHubHeavyFixture(),
  createBridgeHeavyFixture(),
  createTestHeavyFixture(),
  createFieldHeavyFixture(),
  createTriggerHandlerFixture(),
  createDisconnectedComponentsFixture(),
  createLongChainFixture(),
  createDenseCrossDomainFixture(),
  createSparseGraphFixture(),
  createScale100PlusFixture(),
];
