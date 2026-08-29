import { createComponentWorker } from '@daneren2005/shared-memory-ecs/worker';

import { createPatrolChaseUpdate } from '../patrol-chase';

const behavior = createPatrolChaseUpdate();
createComponentWorker(self, behavior.update);
