import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiPatch, apiDelete } from "@/lib/api-client";
import { useTeams, useTeamMembers, type Team } from "@/hooks/use-team-queries";
import { queryKeys } from "@/lib/query-keys";
import { Plus, Edit2, Trash2, Users } from "lucide-react";

export default function TeamsTab() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", slackChannel: "" });
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const teamsQuery = useTeams();

  const teamMembersQuery = useTeamMembers(selectedTeam?.id ?? "");

  const createMutation = useMutation({
    mutationFn: (data: { name: string; slackChannel?: string }) =>
      apiPost("/api/teams", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams() });
      setIsCreateDialogOpen(false);
      setFormData({ name: "", slackChannel: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name?: string; slackChannel?: string }) =>
      apiPatch(`/api/teams/${data.id}`, { name: data.name, slackChannel: data.slackChannel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams() });
      setIsEditDialogOpen(false);
      setFormData({ name: "", slackChannel: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (teamId: string) => apiDelete(`/api/teams/${teamId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams() });
      setIsDeleteDialogOpen(false);
      setSelectedTeam(null);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: { teamId: string; staffUserId: string }) =>
      apiPost(`/api/teams/${data.teamId}/members`, { staffUserId: data.staffUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams() });
      if (selectedTeam) {
        queryClient.invalidateQueries({ queryKey: [...queryKeys.teams(), selectedTeam.id, "members"] });
      }
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (data: { teamId: string; staffUserId: string }) =>
      apiDelete(`/api/teams/${data.teamId}/members/${data.staffUserId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams() });
      if (selectedTeam) {
        queryClient.invalidateQueries({ queryKey: [...queryKeys.teams(), selectedTeam.id, "members"] });
      }
    },
  });

  const handleCreate = () => {
    createMutation.mutate({ name: formData.name, slackChannel: formData.slackChannel || undefined });
  };

  const handleUpdate = () => {
    if (selectedTeam) {
      updateMutation.mutate({ id: selectedTeam.id, name: formData.name, slackChannel: formData.slackChannel || undefined });
    }
  };

  const handleDelete = () => {
    if (selectedTeam) {
      deleteMutation.mutate(selectedTeam.id);
    }
  };

  const openCreateDialog = () => {
    setFormData({ name: "", slackChannel: "" });
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (team: Team) => {
    setSelectedTeam(team);
    setFormData({ name: team.name, slackChannel: team.slackChannel || "" });
    setIsEditDialogOpen(true);
  };

  const openMembersDialog = (team: Team) => {
    setSelectedTeam(team);
    setIsMembersDialogOpen(true);
  };

  const openDeleteDialog = (team: Team) => {
    setSelectedTeam(team);
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-2xl">Team Management</CardTitle>
            <CardDescription>Manage teams and staff assignments.</CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        </CardHeader>
        <CardContent>
          {teamsQuery.isError ? (
            <div className="text-sm text-destructive">
              Failed to load teams
            </div>
          ) : teamsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading teams...</div>
          ) : (teamsQuery.data ?? []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No teams created yet. Create your first team to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slack Channel</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(teamsQuery.data ?? []).map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>{team.slackChannel || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openMembersDialog(team)}
                      >
                        <Users className="mr-1 h-3 w-3" />
                        Manage
                      </Button>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(team)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(team)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>Create a new team to manage club assignments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name *</Label>
              <Input
                id="team-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Dallas Team"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slack-channel">Slack Channel (Optional)</Label>
              <Input
                id="slack-channel"
                value={formData.slackChannel}
                onChange={(e) => setFormData({ ...formData, slackChannel: e.target.value })}
                placeholder="e.g., #dallas-team"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !formData.name.trim()}>
              {createMutation.isPending ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Update team information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-team-name">Team Name *</Label>
              <Input
                id="edit-team-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slack-channel">Slack Channel (Optional)</Label>
              <Input
                id="edit-slack-channel"
                value={formData.slackChannel}
                onChange={(e) => setFormData({ ...formData, slackChannel: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending || !formData.name.trim()}>
              {updateMutation.isPending ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTeam?.name}"? This action cannot be undone.
              Clubs assigned to this team will become global.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Team Members - {selectedTeam?.name}</DialogTitle>
            <DialogDescription>Manage staff members assigned to this team.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {teamMembersQuery.isLoading ? (
              <div className="text-center text-muted-foreground">Loading members...</div>
            ) : (teamMembersQuery.data ?? []).length === 0 ? (
              <div className="text-center text-muted-foreground">
                No members assigned to this team yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(teamMembersQuery.data ?? []).map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-mono text-sm">{member.staffUserId}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!selectedTeam) return;
                            removeMemberMutation.mutate({ teamId: selectedTeam.id, staffUserId: member.staffUserId });
                          }}
                          disabled={removeMemberMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <div className="flex items-center gap-2 pt-4 border-t">
            <div className="flex-1">
              <Label htmlFor="add-member">Add Staff Member</Label>
              <Input
                id="add-member"
                ref={inputRef}
                placeholder="Enter staff user ID"
                className="h-9"
              />
            </div>
            <Button
              onClick={() => {
                if (!selectedTeam) return;
                const value = inputRef.current?.value;
                if (value) {
                  addMemberMutation.mutate({ teamId: selectedTeam.id, staffUserId: value });
                  inputRef.current!.value = "";
                }
              }}
              disabled={addMemberMutation.isPending}
            >
              Add Member
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsMembersDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}