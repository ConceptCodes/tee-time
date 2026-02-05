export interface Club {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClubLocation {
  id: string;
  clubId: string;
  name: string;
  address: string;
  locationPoint: { x: number; y: number };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClubLocationBay {
  id: string;
  clubLocationId: string;
  name: string;
  status: "available" | "booked" | "maintenance";
  createdAt: Date;
  updatedAt: Date;
}
