import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Team {
  id: string;
  name: string;
  slackChannel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  staffUserId: string;
  createdAt: string;
}

export const useTeams = () =>
  useQuery({
    queryKey: queryKeys.teams(),
    queryFn: async () => {
      const response = await apiGet<{ data: Team[] }>(
        "/api/teams"
      );
      return response.data;
    },
  });

export const useTeamMembers = (teamId: string) =>
  useQuery({
    queryKey: [...queryKeys.teams(), teamId, "members"],
    queryFn: async () => {
      const response = await apiGet<{ data: TeamMember[] }>(
        `/api/teams/${teamId}/members`
      );
      return response.data;
    },
    enabled: !!teamId,
  });
