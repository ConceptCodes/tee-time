import {
  createClubLocationBayRepository,
  type Database,
} from "@syndicate/database";
import { logger } from "./logger";

export const listBaysByLocation = async (
  db: Database,
  clubLocationId: string
) => {
  const repo = createClubLocationBayRepository(db);
  const bays = await repo.listByLocationId(clubLocationId);
  logger.info("core.bays.list", {
    clubLocationId,
    count: bays.length,
  });
  return bays;
};

export const reserveBayById = async (db: Database, bayId: string) => {
  const repo = createClubLocationBayRepository(db);
  const bay = await repo.reserve(bayId, new Date());
  if (!bay) {
    return null;
  }
  logger.info("core.bays.reserve", { bayId: bay.id });
  return bay;
};

export const reserveFirstAvailableBay = async (
  db: Database,
  clubLocationId: string
) => {
  const repo = createClubLocationBayRepository(db);
  const available = await repo.listByLocationId(clubLocationId, {
    status: "available",
  });
  if (available.length === 0) {
    return null;
  }
  const reserved = await repo.reserve(available[0].id, new Date());
  if (!reserved) {
    return null;
  }
  logger.info("core.bays.reserve", { bayId: reserved.id });
  return reserved;
};

export const releaseBayById = async (db: Database, bayId: string) => {
  const repo = createClubLocationBayRepository(db);
  const bay = await repo.release(bayId, new Date());
  if (!bay) {
    return null;
  }
  logger.info("core.bays.release", { bayId: bay.id });
  return bay;
};
