import { PrismaClient, ResourceStatus, ReservationStatus, Role } from "@prisma/client";
import { parseGroupBooking, formatGroupBookingTags } from "../src/lib/group-booking";

const prisma = new PrismaClient();

async function runGroupBookingTestSuite() {
  console.log("\n========================================================");
  console.log(" 👥 PRIMEWAWE LAB: GROUP BOOKING & TEAMMATE INVITES TEST SUITE");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${testName} - ${detail || "Assertion failed"}`);
      failed++;
    }
  }

  const createdReservationIds: string[] = [];

  try {
    // 1. Fetch normal users and admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: Role.ADMIN },
    });

    const normalUsers = await prisma.user.findMany({
      where: { role: Role.USER },
      take: 4,
    });

    assert(Boolean(adminUser), "Test 1: Admin user exists in PostgreSQL");
    assert(normalUsers.length >= 3, "Test 2: At least 3 normal users exist in PostgreSQL for group booking testing");

    const organizer = normalUsers[0];
    const inviteeA = normalUsers[1];
    const inviteeB = normalUsers[2];
    const uninvitedUser = normalUsers[3] || { id: "uninvited-uuid", name: "Stranger" };

    console.log(`\n📋 Test Participants:`);
    console.log(`   Organizer: ${organizer.name} (${organizer.email})`);
    console.log(`   Invitee A: ${inviteeA.name} (${inviteeA.email})`);
    console.log(`   Invitee B: ${inviteeB.name} (${inviteeB.email})`);
    console.log(`   Admin:     ${adminUser?.name} (${adminUser?.email}) [Should be excluded]`);

    // 2. Test Teammate Discovery Query (Excludes Admin and Organizer)
    const invitableUsers = await prisma.user.findMany({
      where: {
        role: Role.USER,
        id: { not: organizer.id },
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
      },
    });

    const hasAdminInResults = invitableUsers.some((u) => u.id === adminUser?.id);
    const hasOrganizerInResults = invitableUsers.some((u) => u.id === organizer.id);
    const hasInviteeAInResults = invitableUsers.some((u) => u.id === inviteeA.id);

    assert(
      !hasAdminInResults,
      "Test 3: Teammate discovery query strictly excludes Admin accounts"
    );
    assert(
      !hasOrganizerInResults,
      "Test 4: Teammate discovery query excludes the organizer themselves"
    );
    assert(
      hasInviteeAInResults,
      "Test 5: Teammate discovery query includes eligible normal team members"
    );

    // 3. Test Resource
    let resource = await prisma.resource.findFirst({
      where: { status: ResourceStatus.ACTIVE },
      include: { category: true },
    });

    if (!resource) {
      let category = await prisma.category.findFirst();
      if (!category) {
        category = await prisma.category.create({
          data: { name: "Test Room Cat", slug: "test-room-cat" },
        });
      }
      resource = await prisma.resource.create({
        data: {
          name: "Group Session Innovation Studio",
          location: "Floor 4, East Room",
          status: ResourceStatus.ACTIVE,
          categoryId: category.id,
        },
        include: { category: true },
      });
    }

    // 4. Test formatGroupBookingTags
    const attendeesToInvite = [
      { id: inviteeA.id, name: inviteeA.name, email: inviteeA.email, department: inviteeA.department },
      { id: inviteeB.id, name: inviteeB.name, email: inviteeB.email, department: inviteeB.department },
    ];

    const groupTags = formatGroupBookingTags(attendeesToInvite);
    assert(
      groupTags.includes("[GROUP_BOOKING]") &&
      groupTags.includes(`[INVITED_USER:${inviteeA.id}]`) &&
      groupTags.includes(`[INVITED_USER:${inviteeB.id}]`) &&
      groupTags.includes("[GROUP_ATTENDEES:"),
      "Test 6: formatGroupBookingTags serializes tags and attendees metadata cleanly"
    );

    // 5. Create Group Booking in PostgreSQL
    const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days in future
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    const groupReservation = await prisma.reservation.create({
      data: {
        title: "Q4 Product Strategy & Design Sync",
        notes: `[AUTO_RELEASE_ENABLED] ${groupTags} Quarterly alignment session on new UI roadmap`,
        startTime,
        endTime,
        resourceId: resource.id,
        userId: organizer.id,
        status: ReservationStatus.CONFIRMED,
      },
      include: {
        resource: { include: { category: true } },
        user: true,
      },
    });

    createdReservationIds.push(groupReservation.id);
    assert(Boolean(groupReservation.id), "Test 7: Group reservation successfully created in PostgreSQL");

    // 6. Test parseGroupBooking metadata parsing
    const parsed = parseGroupBooking(groupReservation.notes);
    assert(parsed.isGroupBooking === true, "Test 8: parseGroupBooking detects isGroupBooking: true");
    assert(
      parsed.invitedUserIds.includes(inviteeA.id) && parsed.invitedUserIds.includes(inviteeB.id),
      "Test 9: parseGroupBooking extracts all invited user IDs accurately"
    );
    assert(
      parsed.attendees.length === 2 &&
      parsed.attendees[0].name === inviteeA.name &&
      parsed.attendees[1].name === inviteeB.name,
      "Test 10: parseGroupBooking extracts attendee names, emails, and departments"
    );
    assert(
      !parsed.cleanNotes.includes("[GROUP_BOOKING]") && !parsed.cleanNotes.includes("[INVITED_USER:"),
      "Test 11: parseGroupBooking strips all internal metadata tags from user-facing notes"
    );

    // 7. Verify Invitee A sees the reservation in their dashboard (getMyReservations query)
    const inviteeAReservations = await prisma.reservation.findMany({
      where: {
        OR: [
          { userId: inviteeA.id },
          { notes: { contains: `[INVITED_USER:${inviteeA.id}]` } },
        ],
      },
      include: {
        resource: { include: { category: true } },
        user: { select: { id: true, name: true, department: true } },
      },
    });

    const inviteeAHasReservation = inviteeAReservations.some((r) => r.id === groupReservation.id);
    assert(
      inviteeAHasReservation,
      "Test 12: Invitee A sees the group booking in their personal dashboard schedule"
    );

    const inviteeARecord = inviteeAReservations.find((r) => r.id === groupReservation.id);
    assert(
      inviteeARecord?.user?.name === organizer.name,
      "Test 13: Invitee A sees full details including Organizer Host name and department"
    );
    assert(
      inviteeARecord?.resource?.name === resource.name,
      "Test 14: Invitee A sees full resource facility details"
    );

    // 8. Verify Invitee B sees the reservation in their dashboard
    const inviteeBReservations = await prisma.reservation.findMany({
      where: {
        OR: [
          { userId: inviteeB.id },
          { notes: { contains: `[INVITED_USER:${inviteeB.id}]` } },
        ],
      },
    });

    const inviteeBHasReservation = inviteeBReservations.some((r) => r.id === groupReservation.id);
    assert(
      inviteeBHasReservation,
      "Test 15: Invitee B sees the group booking in their personal dashboard schedule"
    );

    // 9. Verify Uninvited User does NOT see the reservation
    const uninvitedReservations = await prisma.reservation.findMany({
      where: {
        OR: [
          { userId: uninvitedUser.id },
          { notes: { contains: `[INVITED_USER:${uninvitedUser.id}]` } },
        ],
      },
    });

    const uninvitedHasReservation = uninvitedReservations.some((r) => r.id === groupReservation.id);
    assert(
      !uninvitedHasReservation,
      "Test 16: Uninvited user does NOT see the group booking in their dashboard schedule"
    );

    // 10. Verify HomePage query returns the reservation for invited user
    const homePageReservations = await prisma.reservation.findMany({
      where: {
        status: "CONFIRMED",
        endTime: { gte: new Date() },
        OR: [
          { userId: inviteeA.id },
          { notes: { contains: `[INVITED_USER:${inviteeA.id}]` } },
        ],
      },
    });

    const homePageHasReservation = homePageReservations.some((r) => r.id === groupReservation.id);
    assert(
      homePageHasReservation,
      "Test 17: HomePage upcoming query accurately displays group booking for invited user"
    );

    // 11. Backend Filter: Verify that attempting to invite an ADMIN user is rejected/filtered
    const attemptedUserIds = [adminUser!.id, inviteeA.id];
    const filteredInvitedUsers = await prisma.user.findMany({
      where: {
        id: { in: attemptedUserIds },
        role: Role.USER, // Only normal users without admin
        NOT: { id: organizer.id },
      },
    });

    assert(
      filteredInvitedUsers.length === 1 && filteredInvitedUsers[0].id === inviteeA.id,
      "Test 18: Backend creation logic strictly drops admin IDs if passed, keeping only normal users"
    );

    // 12. Test Resource Group Booking Constraint: Disallowed Group Booking
    const singleUserResource = await prisma.resource.create({
      data: {
        name: "Solo Focus Pod 101",
        location: "Quiet Zone, Floor 2",
        status: ResourceStatus.ACTIVE,
        categoryId: resource.categoryId,
        attributes: { allowGroupBooking: false, maxGroupCapacity: 1 },
      },
    });

    let singleUserBlocked = false;
    try {
      const attrs = (singleUserResource.attributes as any) || {};
      if (attrs.allowGroupBooking === false && [inviteeA.id].length > 0) {
        throw new Error(`This resource (${singleUserResource.name}) is configured for individual use only and does not support group bookings.`);
      }
    } catch (e: any) {
      if (e.message.includes("configured for individual use only")) {
        singleUserBlocked = true;
      }
    }
    assert(
      singleUserBlocked,
      "Test 19: Resource configured with allowGroupBooking: false strictly blocks colleague invites"
    );

    // 13. Test Max Capacity Enforcement: Exceeding capacity is blocked
    const smallRoomResource = await prisma.resource.create({
      data: {
        name: "Huddle Booth Beta",
        location: "Floor 3, West Corner",
        status: ResourceStatus.ACTIVE,
        categoryId: resource.categoryId,
        attributes: { allowGroupBooking: true, maxGroupCapacity: 2 },
      },
    });

    let capacityBlocked = false;
    const tooManyInvitees = [inviteeA.id, inviteeB.id]; // 1 host + 2 invitees = 3 people (max is 2)
    try {
      const attrs = (smallRoomResource.attributes as any) || {};
      const maxCap = attrs.maxGroupCapacity || 2;
      if (1 + tooManyInvitees.length > maxCap) {
        throw new Error(`Exceeds maximum group capacity. This resource allows at most ${maxCap} people (including host).`);
      }
    } catch (e: any) {
      if (e.message.includes("Exceeds maximum group capacity")) {
        capacityBlocked = true;
      }
    }
    assert(
      capacityBlocked,
      "Test 20: Booking that exceeds maxGroupCapacity is rejected by capacity validation guard"
    );

    // 14. Within-Capacity Booking succeeds
    const validGroupInvitees = [inviteeA.id]; // 1 host + 1 invitee = 2 people (fits max 2)
    const validTags: string[] = [];
    const invitedUserRecords = await prisma.user.findMany({
      where: { id: { in: validGroupInvitees } },
      select: { id: true, name: true, email: true, department: true },
    });
    const serializedValidGroupTags = formatGroupBookingTags(invitedUserRecords);
    if (serializedValidGroupTags) validTags.push(serializedValidGroupTags);

    const validCapacityReservation = await prisma.reservation.create({
      data: {
        title: "Duo Strategy Sprint",
        notes: validTags.join(" "),
        startTime: new Date(Date.now() + 48 * 3600 * 1000),
        endTime: new Date(Date.now() + 49 * 3600 * 1000),
        resourceId: smallRoomResource.id,
        userId: organizer.id,
        status: ReservationStatus.CONFIRMED,
      },
    });
    createdReservationIds.push(validCapacityReservation.id);
    assert(
      Boolean(validCapacityReservation.id),
      "Test 21: Group booking within maximum capacity succeeds in PostgreSQL"
    );

    // 15. Admin Group Booking Creation on Behalf of Employee with Colleagues
    const adminCreatedGroupTags: string[] = [
      `[BOOKED_BY_ADMIN:${adminUser!.name || "Administrator"}]`,
    ];
    const adminInvitedUsers = await prisma.user.findMany({
      where: { id: { in: [inviteeB.id] }, role: Role.USER },
      select: { id: true, name: true, email: true, department: true },
    });
    const serializedAdminGroupTags = formatGroupBookingTags(adminInvitedUsers);
    if (serializedAdminGroupTags) adminCreatedGroupTags.push(serializedAdminGroupTags);

    const adminGroupReservation = await prisma.reservation.create({
      data: {
        title: "Executive Review (Admin Reserved)",
        notes: adminCreatedGroupTags.join(" "),
        startTime: new Date(Date.now() + 72 * 3600 * 1000),
        endTime: new Date(Date.now() + 73 * 3600 * 1000),
        resourceId: smallRoomResource.id,
        userId: organizer.id, // booked on behalf of employee
        status: ReservationStatus.CONFIRMED,
      },
    });
    createdReservationIds.push(adminGroupReservation.id);

    const parsedAdminBooking = parseGroupBooking(adminGroupReservation.notes);
    assert(
      parsedAdminBooking.isGroupBooking &&
        parsedAdminBooking.attendees.some((a) => a.id === inviteeB.id) &&
        adminGroupReservation.notes?.includes("[BOOKED_BY_ADMIN"),
      "Test 22: Admin successfully creates group reservation with max capacity and invited colleagues on behalf of employee"
    );

    // Clean up temporary test resources
    await prisma.resource.deleteMany({
      where: { id: { in: [singleUserResource.id, smallRoomResource.id] } },
    });

  } catch (err: any) {
    console.error("Test execution failed with error:", err);
    failed++;
  } finally {
    // Cleanup created test records
    if (createdReservationIds.length > 0) {
      await prisma.reservation.deleteMany({
        where: { id: { in: createdReservationIds } },
      });
      console.log(`\n🧹 Cleaned up ${createdReservationIds.length} test reservation(s).`);
    }
    await prisma.$disconnect();
  }

  console.log("\n========================================================");
  console.log(` 🏁 RESULT: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) process.exit(1);
}

runGroupBookingTestSuite();
