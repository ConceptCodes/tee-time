export interface MemberProfile {
  id: string;
  phoneNumber: string;
  name: string;
  timezone: string;
  favoriteLocationLabel: string;
  favoriteLocationPoint?: { x: number; y: number };
  preferredLocationLabel?: string;
  preferredTimeOfDay?: string;
  preferredBayLabel?: string;
  membershipId: string;
  onboardingCompletedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
