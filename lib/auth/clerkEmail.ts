/** Primary email from a Clerk user-like object (API or webhook shape). */
export function primaryEmailFromClerkUser(user: {
	primaryEmailAddressId?: string | null;
	emailAddresses?: Array<{ id?: string; emailAddress?: string }>;
	email_addresses?: Array<{ id?: string; email_address?: string }>;
	primary_email_address_id?: string | null;
}): string | null {
	const camel = user.emailAddresses || [];
	if (camel.length) {
		const primaryId = user.primaryEmailAddressId;
		const primary = primaryId
			? camel.find((e) => e.id === primaryId)
			: undefined;
		const addr = (primary || camel[0])?.emailAddress?.trim();
		return addr || null;
	}

	const snake = user.email_addresses || [];
	if (snake.length) {
		const primaryId = user.primary_email_address_id;
		const primary = primaryId
			? snake.find((e) => e.id === primaryId)
			: undefined;
		const addr = (primary || snake[0])?.email_address?.trim();
		return addr || null;
	}

	return null;
}
