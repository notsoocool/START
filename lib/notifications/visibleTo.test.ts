import { describe, expect, test } from "bun:test";
import { notificationsVisibleTo } from "./visibleTo";

describe("notificationsVisibleTo", () => {
	test("lets an admin see alerts sent to admins", () => {
		const query = notificationsVisibleTo("user_admin", "Admin");
		expect(JSON.stringify(query)).toContain('"recipientID":"admins"');
	});

	test("does not show admin alerts to an annotator", () => {
		const query = notificationsVisibleTo("user_annotator", "Annotator");
		expect(JSON.stringify(query)).not.toContain('"recipientID":"admins"');
	});
});
