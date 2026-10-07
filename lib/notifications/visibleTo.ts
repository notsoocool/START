/** Notifications the signed-in user is allowed to see. */
export function notificationsVisibleTo(userId: string, perms: string): Record<string, unknown> {
	if (perms === "Root") {
		return {
			$or: [
				{ subject: { $not: { $regex: "Error Report Resolved:", $options: "i" } } },
				{ subject: { $exists: false } },
			],
		};
	}

	const recipients: Array<Record<string, unknown>> = [{ recipientID: userId }, { recipientID: null }];
	if (perms === "Admin") {
		recipients.push({ recipientID: "admins" });
	}

	return {
		$or: [
			{
				$and: [
					{ $or: recipients },
					{ $or: [{ isErrorReport: false }, { isErrorReport: { $exists: false } }] },
				],
			},
			{
				$and: [{ recipientID: userId }, { subject: { $regex: "Error Report Resolved:", $options: "i" } }],
			},
		],
	};
}
