import { createComponentWorker } from '@daneren2005/shared-memory-ecs/worker';

import { movementUpdate } from '../movement-update';

createComponentWorker(self, movementUpdate);
