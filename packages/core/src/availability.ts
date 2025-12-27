import {
  createClubLocationBayRepository,
  type Database,
} from "@syndicate/database";
import { logger } from "./logger";

export type BayAvailability = {
  locationFull: boolean;
  availableBays: Array<{ id: string; name: string }>;
  suggestedTimes: string[];
};

export const getBayAvailability = async (
  db: Database,
  clubLocationId: string
): Promise<BayAvailability> => {
  const repo = createClubLocationBayRepository(db);
  const available = await repo.listByLocationId(clubLocationId, {
    status: "available",
  });
  const availability: BayAvailability = {
    locationFull: available.length === 0,
    availableBays: available.map((bay) => ({ id: bay.id, name: bay.name })),
    suggestedTimes: [],
  };
  logger.info("core.availability.bays", {
    clubLocationId,
    availableCount: available.length,
  });
  return availability;
};
