"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GroupDetails {
	_id: string;
	name: string;
	type: "A" | "B";
	members: string[];
	assignedBooks?: string[];
	supervisedGroups?: (string | { _id: string; name: string; type: string; members: string[]; assignedBooks: string[] })[];
}

interface UserInfo {
	userID: string;
	name: string;
	perms: string;
}

interface SupervisorInfo {
	groupId: string;
	groupName: string;
	supervisors: UserInfo[];
}

interface SupervisedGroupInfo {
	groupId: string;
	groupName: string;
	members: UserInfo[];
}

export default function GroupInfoPage() {
	const router = useRouter();
	const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [userPermissions, setUserPermissions] = useState<string | null>(null);
	const [userGroups, setUserGroups] = useState<string[]>([]);
	const [bookAssignedGroup, setBookAssignedGroup] = useState<string | null>(null);
	const [userNames, setUserNames] = useState<{ [key: string]: string }>({});
	const [supervisors, setSupervisors] = useState<SupervisorInfo[]>([]);
	const [allUserGroups, setAllUserGroups] = useState<GroupDetails[]>([]);
	const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
	const [supervisedGroupMembers, setSupervisedGroupMembers] = useState<SupervisedGroupInfo[]>([]);

	const handleGroupSwitch = async (index: number) => {
		if (index >= 0 && index < allUserGroups.length) {
			setSelectedGroupIndex(index);
			setGroupDetails(allUserGroups[index]);

			// Fetch details for the selected group
			const fetchGroupDetails = async (groupData: GroupDetails) => {
				// Fetch user names for all members in the group
				if (groupData.members && groupData.members.length > 0) {
					try {
						const memberIds = groupData.members;
						const usersResponse = await fetch(`/api/users?ids=${memberIds.join(",")}`);
						if (usersResponse.ok) {
							const usersData = await usersResponse.json();
							const nameMapping: { [key: string]: string } = {};

							usersData.users.forEach((user: UserInfo) => {
								nameMapping[user.userID] = user.name;
							});

							setUserNames(nameMapping);
						}
					} catch (error) {
						console.error("Error fetching user names:", error);
					}
				}

				// If this is a Group A, fetch supervisor information
				if (groupData.type === "A") {
					try {
						const allGroupsResponse = await fetch("/api/groups");
						if (allGroupsResponse.ok) {
							const allGroups = await allGroupsResponse.json();

							const supervisingGroups = allGroups.filter((group: any) => {
								if (group.type !== "B" || !group.supervisedGroups) return false;

								return group.supervisedGroups.some((supervisedGroup: any) => {
									if (typeof supervisedGroup === "object" && supervisedGroup._id) {
										return supervisedGroup._id === groupData._id;
									}
									return supervisedGroup === groupData._id;
								});
							});

							if (supervisingGroups.length > 0) {
								const supervisorInfo: SupervisorInfo[] = [];

								for (const supervisingGroup of supervisingGroups) {
									if (supervisingGroup.members && supervisingGroup.members.length > 0) {
										const supervisorResponse = await fetch(`/api/users?ids=${supervisingGroup.members.join(",")}`);
										if (supervisorResponse.ok) {
											const supervisorData = await supervisorResponse.json();
											supervisorInfo.push({
												groupId: supervisingGroup._id,
												groupName: supervisingGroup.name,
												supervisors: supervisorData.users,
											});
										}
									}
								}

								setSupervisors(supervisorInfo);
							} else {
								setSupervisors([]);
							}
						}
					} catch (error) {
						console.error("Error fetching supervisor information:", error);
					}
				} else {
					setSupervisors([]);
				}

				// If this is a Group B, fetch supervised group members
				if (groupData.type === "B" && groupData.supervisedGroups && groupData.supervisedGroups.length > 0) {
					try {
						const supervisedGroupsInfo: SupervisedGroupInfo[] = [];

						for (const supervisedGroup of groupData.supervisedGroups) {
							// Get the supervised group ID (handle both object and string)
							const supervisedGroupId =
								typeof supervisedGroup === "object" && supervisedGroup && "_id" in supervisedGroup ? (supervisedGroup as any)._id : supervisedGroup;

							// Fetch the supervised group details
							const supervisedGroupResponse = await fetch(`/api/groups/${supervisedGroupId}`);
							if (supervisedGroupResponse.ok) {
								const supervisedGroupData = await supervisedGroupResponse.json();

								// Fetch member names for this supervised group
								if (supervisedGroupData.members && supervisedGroupData.members.length > 0) {
									const membersResponse = await fetch(`/api/users?ids=${supervisedGroupData.members.join(",")}`);
									if (membersResponse.ok) {
										const membersData = await membersResponse.json();
										supervisedGroupsInfo.push({
											groupId: supervisedGroupData._id,
											groupName: supervisedGroupData.name,
											members: membersData.users,
										});
									}
								}
							}
						}

						setSupervisedGroupMembers(supervisedGroupsInfo);
					} catch (error) {
						console.error("Error fetching supervised group members:", error);
					}
				} else {
					setSupervisedGroupMembers([]);
				}
			};

			await fetchGroupDetails(allUserGroups[index]);
		}
	};

	useEffect(() => {
		const fetchUserAndGroupInfo = async () => {
			try {
				// Fetch user permissions
				const userResponse = await fetch("/api/getCurrentUser");
				if (!userResponse.ok) {
					throw new Error("User not authenticated");
				}
				const userData = await userResponse.json();
				setUserPermissions(userData.perms);

				// Fetch user's group membership
				const groupsResponse = await fetch("/api/groups");
				if (groupsResponse.ok) {
					const groupsData = await groupsResponse.json();
					const userGroups = groupsData.filter((group: any) => group.members && group.members.includes(userData.id)).map((group: any) => group._id);
					setUserGroups(userGroups);

					// Fetch all groups the user belongs to
					if (userGroups.length > 0) {
						const allGroupsData: GroupDetails[] = [];

						for (const groupId of userGroups) {
							const groupResponse = await fetch(`/api/groups/${groupId}`);
							if (groupResponse.ok) {
								const groupData = await groupResponse.json();
								allGroupsData.push(groupData);
							}
						}

						setAllUserGroups(allGroupsData);

						// Set the first group as default
						if (allGroupsData.length > 0) {
							setGroupDetails(allGroupsData[0]);
							await fetchGroupDetails(allGroupsData[0]);
						}
					}
				}
			} catch (error) {
				console.error("Error fetching group info:", error);
				toast.error("Failed to load group information");
			} finally {
				setLoading(false);
			}
		};

		const fetchGroupDetails = async (groupData: GroupDetails) => {
			// Fetch user names for all members in the group
			if (groupData.members && groupData.members.length > 0) {
				try {
					// Create a query to fetch specific users by their IDs
					const memberIds = groupData.members;
					const usersResponse = await fetch(`/api/users?ids=${memberIds.join(",")}`);
					if (usersResponse.ok) {
						const usersData = await usersResponse.json();
						const nameMapping: { [key: string]: string } = {};

						usersData.users.forEach((user: UserInfo) => {
							nameMapping[user.userID] = user.name;
						});

						setUserNames(nameMapping);
					}
				} catch (error) {
					console.error("Error fetching user names:", error);
				}
			}

			// If this is a Group A, fetch supervisor information
			if (groupData.type === "A") {
				try {
					// Get all groups to find which Group B supervises this Group A
					const allGroupsResponse = await fetch("/api/groups");
					if (allGroupsResponse.ok) {
						const allGroups = await allGroupsResponse.json();

						// Find Group B groups that supervise this Group A
						// The supervisedGroups array in Group B contains the IDs of Group A groups it supervises
						const supervisingGroups = allGroups.filter((group: any) => {
							if (group.type !== "B" || !group.supervisedGroups) return false;

							// Check if supervisedGroups contains objects or strings
							return group.supervisedGroups.some((supervisedGroup: any) => {
								// If it's an object, check the _id property
								if (typeof supervisedGroup === "object" && supervisedGroup && "_id" in supervisedGroup) {
									return (supervisedGroup as any)._id === groupData._id;
								}
								// If it's a string, check directly
								return supervisedGroup === groupData._id;
							});
						});

						if (supervisingGroups.length > 0) {
							const supervisorInfo: SupervisorInfo[] = [];

							for (const supervisingGroup of supervisingGroups) {
								// Fetch supervisor names
								if (supervisingGroup.members && supervisingGroup.members.length > 0) {
									const supervisorResponse = await fetch(`/api/users?ids=${supervisingGroup.members.join(",")}`);
									if (supervisorResponse.ok) {
										const supervisorData = await supervisorResponse.json();
										supervisorInfo.push({
											groupId: supervisingGroup._id,
											groupName: supervisingGroup.name,
											supervisors: supervisorData.users,
										});
									}
								}
							}

							setSupervisors(supervisorInfo);
						} else {
							setSupervisors([]);
						}
					}
				} catch (error) {
					console.error("Error fetching supervisor information:", error);
				}
			} else {
				setSupervisors([]);
			}

			// If this is a Group B, fetch supervised group members
			if (groupData.type === "B" && groupData.supervisedGroups && groupData.supervisedGroups.length > 0) {
				try {
					const supervisedGroupsInfo: SupervisedGroupInfo[] = [];

					for (const supervisedGroup of groupData.supervisedGroups) {
						// Get the supervised group ID (handle both object and string)
						const supervisedGroupId =
							typeof supervisedGroup === "object" && supervisedGroup && "_id" in supervisedGroup ? (supervisedGroup as any)._id : supervisedGroup;

						// Fetch the supervised group details
						const supervisedGroupResponse = await fetch(`/api/groups/${supervisedGroupId}`);
						if (supervisedGroupResponse.ok) {
							const supervisedGroupData = await supervisedGroupResponse.json();

							// Fetch member names for this supervised group
							if (supervisedGroupData.members && supervisedGroupData.members.length > 0) {
								const membersResponse = await fetch(`/api/users?ids=${supervisedGroupData.members.join(",")}`);
								if (membersResponse.ok) {
									const membersData = await membersResponse.json();
									supervisedGroupsInfo.push({
										groupId: supervisedGroupData._id,
										groupName: supervisedGroupData.name,
										members: membersData.users,
									});
								}
							}
						}
					}

					setSupervisedGroupMembers(supervisedGroupsInfo);
				} catch (error) {
					console.error("Error fetching supervised group members:", error);
				}
			} else {
				setSupervisedGroupMembers([]);
			}
		};

		fetchUserAndGroupInfo();
	}, []);

	if (loading) {
		return (
			<div className="container mx-auto p-6">
				<div className="flex items-center justify-center h-64">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			</div>
		);
	}

	if (!groupDetails) {
		return (
			<div className="container mx-auto p-6">
				<Card>
					<CardHeader>
						<CardTitle>Group Information</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">You are not assigned to any groups or no group information is available.</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button variant="outline" size="sm" onClick={() => router.back()}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Button>
					<h1 className="text-2xl font-bold">Group Information</h1>
				</div>
				<div className="flex items-center gap-4">
					{allUserGroups.length > 1 && (
						<Select value={selectedGroupIndex.toString()} onValueChange={(value) => handleGroupSwitch(parseInt(value))}>
							<SelectTrigger className="w-[200px]">
								<SelectValue placeholder="Select group" />
							</SelectTrigger>
							<SelectContent>
								{allUserGroups.map((group, index) => (
									<SelectItem key={index} value={index.toString()}>
										{group.name} ({group.type === "A" ? "Annotator" : "Supervisor"})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
					<Badge variant={groupDetails.type === "A" ? "default" : "secondary"}>{groupDetails.type === "A" ? "Annotator Group" : "Supervisor Group"}</Badge>
				</div>
			</div>

			{/* Group Basic Info */}
			<Card>
				<CardHeader>
					<CardTitle>{groupDetails.name}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<h3 className="font-medium mb-2">Group Type</h3>
							<p className="text-sm text-muted-foreground">{groupDetails.type === "A" ? "Annotator Group" : "Supervisor Group"}</p>
						</div>
						<div>
							<h3 className="font-medium mb-2">Total Members</h3>
							<p className="text-sm text-muted-foreground">{groupDetails.members?.length || 0} members</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Group Members */}
			<Card>
				<CardHeader>
					<CardTitle>Group Members ({groupDetails.members?.length || 0})</CardTitle>
				</CardHeader>
				<CardContent>
					{groupDetails.members && groupDetails.members.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
							{groupDetails.members.map((memberId: string, index: number) => (
								<div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
									<div className="w-3 h-3 bg-blue-500 rounded-full"></div>
									<div className="flex-1">
										<p className="font-medium text-sm">{userNames[memberId] || "Unknown User"}</p>
										<p className="text-xs text-muted-foreground">
											ID: {memberId.length > 8 ? `${memberId.substring(0, 4)}***${memberId.substring(memberId.length - 4)}` : "***"}
										</p>
									</div>
								</div>
							))}
						</div>
					) : (
						<p className="text-muted-foreground">No members found</p>
					)}
				</CardContent>
			</Card>

			{/* Supervisors (for Group A) */}
			{groupDetails.type === "A" && (
				<Card>
					<CardHeader>
						<CardTitle>Supervisors ({supervisors.reduce((total, group) => total + group.supervisors.length, 0)})</CardTitle>
					</CardHeader>
					<CardContent>
						{supervisors.length > 0 ? (
							<div className="space-y-4">
								{supervisors.map((supervisorGroup, groupIndex) => (
									<div key={groupIndex} className="space-y-3">
										<h4 className="font-medium text-sm text-muted-foreground">Supervised by: {supervisorGroup.groupName}</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
											{supervisorGroup.supervisors.map((supervisor, index) => (
												<div key={index} className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
													<div className="w-3 h-3 bg-orange-500 rounded-full"></div>
													<div className="flex-1">
														<p className="font-medium text-sm">{supervisor.name}</p>
														<p className="text-xs text-muted-foreground">
															ID:{" "}
															{supervisor.userID.length > 8
																? `${supervisor.userID.substring(0, 4)}***${supervisor.userID.substring(supervisor.userID.length - 4)}`
																: "***"}
														</p>
													</div>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-muted-foreground">No supervisors assigned to this group</p>
						)}
					</CardContent>
				</Card>
			)}

			{/* Assigned Books (for Group A) */}
			{groupDetails.type === "A" && groupDetails.assignedBooks && (
				<Card>
					<CardHeader>
						<CardTitle>Assigned Books ({groupDetails.assignedBooks.length})</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
							{groupDetails.assignedBooks.map((book: string, index: number) => (
								<div key={index} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
									<div className="w-3 h-3 bg-green-500 rounded-full"></div>
									<div>
										<p className="font-medium text-sm">{book}</p>
										<p className="text-xs text-muted-foreground">Assigned Book</p>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Supervised Groups (for Group B) */}
			{groupDetails.type === "B" && groupDetails.supervisedGroups && (
				<Card>
					<CardHeader>
						<CardTitle>Supervised Groups ({groupDetails.supervisedGroups.length})</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
							{groupDetails.supervisedGroups.map((supervisedGroup: any, index: number) => {
								const groupId =
									typeof supervisedGroup === "object" && supervisedGroup && "_id" in supervisedGroup ? (supervisedGroup as any)._id : supervisedGroup;
								const groupName =
									typeof supervisedGroup === "object" && supervisedGroup && "name" in supervisedGroup ? (supervisedGroup as any).name : `Group ${index + 1}`;

								return (
									<div key={index} className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
										<div className="w-3 h-3 bg-purple-500 rounded-full"></div>
										<div>
											<p className="font-medium text-sm">{groupName}</p>
											<p className="text-xs text-muted-foreground">
												ID: {groupId.length > 8 ? `${groupId.substring(0, 4)}***${groupId.substring(groupId.length - 4)}` : "***"}
											</p>
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Supervised Group Members (for Group B) */}
			{groupDetails.type === "B" && supervisedGroupMembers.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Supervised Group Members ({supervisedGroupMembers.reduce((total, group) => total + group.members.length, 0)})</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{supervisedGroupMembers.map((supervisedGroup, groupIndex) => (
								<div key={groupIndex} className="space-y-3">
									<h4 className="font-medium text-sm text-muted-foreground">Members of: {supervisedGroup.groupName}</h4>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
										{supervisedGroup.members.map((member, index) => (
											<div key={index} className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
												<div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
												<div className="flex-1">
													<p className="font-medium text-sm">{member.name}</p>
													<p className="text-xs text-muted-foreground">
														ID: {member.userID.length > 8 ? `${member.userID.substring(0, 4)}***${member.userID.substring(member.userID.length - 4)}` : "***"}
													</p>
												</div>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* User Permission Info */}
			<Card>
				<CardHeader>
					<CardTitle>Your Permissions</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Badge variant="outline">{userPermissions}</Badge>
							<span className="text-sm text-muted-foreground">Permission Level</span>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant={userGroups.includes(groupDetails._id) ? "default" : "secondary"}>
								{userGroups.includes(groupDetails._id) ? "Member" : "Not Member"}
							</Badge>
							<span className="text-sm text-muted-foreground">Group Membership</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
