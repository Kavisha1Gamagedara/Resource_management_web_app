import prisma from "../src/lib/db";
import bcrypt from "bcryptjs";
import { Role, ResourceStatus, ReservationStatus } from "@prisma/client";
import { findConflict, formatConflictMessage } from "../src/lib/booking-engine";

async function runDatabaseCrudVerification() {
  console.log("\n========================================================");
  console.log(" 🐘 POSTGRESQL CRUD INTEGRITY VERIFICATION SUITE");
  console.log("========================================================\n");

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      testPassed++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      testFailed++;
    }
  }

  const timestamp = Date.now();
  const testUserEmail = `crud_test_${timestamp}@primewave.com`;
  let createdUserId = "";
  let createdReservationId = "";
  let testResource: any = null;

  try {
    // ----------------------------------------------------
    // SECTION 1: USER CRUD IN POSTGRESQL
    // ----------------------------------------------------
    console.log("--- 1. Testing USER CRUD in PostgreSQL ---");

    // 1.1 CREATE USER
    const rawPassword = "securePassword123!";
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const createdUser = await prisma.user.create({
      data: {
        name: "Test CRUD User",
        email: testUserEmail,
        passwordHash,
        role: Role.USER,
        department: "Quality Assurance",
        avatarUrl: "https://example.com/avatar.jpg",
      },
    });

    createdUserId = createdUser.id;
    assert(Boolean(createdUser.id), "User CREATE: Successfully inserted into PostgreSQL with UUID primary key");
    assert(createdUser.email === testUserEmail, "User CREATE: Stored email matches exactly");
    assert(createdUser.role === Role.USER, "User CREATE: Role defaults/persists correctly");
    assert(bcrypt.compareSync(rawPassword, createdUser.passwordHash), "User CREATE: Bcrypt hash validates against plaintext password");

    // 1.2 UNIQUE CONSTRAINT CHECK
    let duplicateRejected = false;
    try {
      await prisma.user.create({
        data: {
          name: "Duplicate User",
          email: testUserEmail,
          passwordHash,
          role: Role.USER,
        },
      });
    } catch (e: any) {
      duplicateRejected = true;
    }
    assert(duplicateRejected, "User CREATE: PostgreSQL enforces unique constraint on email");

    // 1.3 READ USER
    const fetchedUser = await prisma.user.findUnique({
      where: { id: createdUserId },
      include: {
        _count: { select: { reservations: true } },
      },
    });

    assert(Boolean(fetchedUser), "User READ: findUnique retrieves user by ID");
    assert(fetchedUser?.department === "Quality Assurance", "User READ: Department attribute retrieved accurately");

    const allUsers = await prisma.user.findMany({
      where: { email: { contains: "primewave.com" } },
      select: { id: true, email: true },
    });
    assert(allUsers.length > 0, `User READ: findMany returns array of users (found ${allUsers.length})`);

    // 1.4 UPDATE USER
    const updatedUser = await prisma.user.update({
      where: { id: createdUserId },
      data: {
        name: "Test CRUD User Updated",
        department: "Advanced Engineering & Robotics",
      },
    });

    assert(updatedUser.name === "Test CRUD User Updated", "User UPDATE: Name successfully updated in PostgreSQL");
    assert(updatedUser.department === "Advanced Engineering & Robotics", "User UPDATE: Department successfully updated in PostgreSQL");

    // ----------------------------------------------------
    // SECTION 2: RESERVATION CRUD IN POSTGRESQL
    // ----------------------------------------------------
    console.log("\n--- 2. Testing RESERVATION CRUD in PostgreSQL ---");

    // Pick an active resource from the database
    testResource = await prisma.resource.findFirst({
      where: { status: ResourceStatus.ACTIVE },
      include: { category: true },
    });

    if (!testResource) {
      throw new Error("No active resource found in database for reservation testing.");
    }

    console.log(`Using Resource: "${testResource.name}" (${testResource.id})`);

    // 2.1 CREATE RESERVATION
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(14, 0, 0, 0); // 2:00 PM
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(15, 30, 0, 0); // 3:30 PM

    const createdReservation = await prisma.reservation.create({
      data: {
        title: "Architecture Deep-Dive Session",
        notes: "[AUTO_RELEASE_ENABLED] Project blueprint review with engineering team",
        startTime: tomorrow,
        endTime: tomorrowEnd,
        resourceId: testResource.id,
        userId: createdUserId,
        status: ReservationStatus.CONFIRMED,
      },
      include: {
        resource: true,
        user: true,
      },
    });

    createdReservationId = createdReservation.id;
    assert(Boolean(createdReservation.id), "Reservation CREATE: Successfully inserted reservation record with UUID");
    assert(createdReservation.status === ReservationStatus.CONFIRMED, "Reservation CREATE: Status initialized to CONFIRMED");
    assert(createdReservation.user.id === createdUserId, "Reservation CREATE: Foreign key relation to User is valid");
    assert(createdReservation.resource.id === testResource.id, "Reservation CREATE: Foreign key relation to Resource is valid");

    // 2.2 READ RESERVATION
    const fetchedReservation = await prisma.reservation.findUnique({
      where: { id: createdReservationId },
      include: {
        resource: { include: { category: true } },
        user: { select: { id: true, name: true, email: true, department: true } },
      },
    });

    assert(Boolean(fetchedReservation), "Reservation READ: Successfully fetched reservation by ID");
    assert(fetchedReservation?.title === "Architecture Deep-Dive Session", "Reservation READ: Title matches");
    assert(Boolean(fetchedReservation?.resource.category?.name), "Reservation READ: Deep-join with Resource and Category resolved");

    // Read by user (User's bookings query)
    const userReservations = await prisma.reservation.findMany({
      where: { userId: createdUserId },
    });
    assert(userReservations.length >= 1, `Reservation READ: Querying by userId returns user's reservations (found ${userReservations.length})`);

    // 2.3 CONFLICT CHECKING & BUFFER VERIFICATION
    const conflictingStart = new Date(tomorrow.getTime() + 15 * 60 * 1000); // 2:15 PM (inside the slot)
    const conflictingEnd = new Date(tomorrow.getTime() + 75 * 60 * 1000);   // 3:15 PM
    const directConflict = await findConflict(prisma, {
      resourceId: testResource.id,
      startTime: conflictingStart,
      endTime: conflictingEnd,
    });

    assert(Boolean(directConflict), "Reservation CONFLICT: PostgreSQL query detects overlapping reservation");

    // 2.4 UPDATE RESERVATION (Reschedule Slot with Self-Exclusion)
    const newStart = new Date(tomorrow);
    newStart.setHours(16, 0, 0, 0); // 4:00 PM
    const newEnd = new Date(tomorrow);
    newEnd.setHours(17, 0, 0, 0);   // 5:00 PM

    // Self-exclusion test: checking conflict with excludeReservationId should NOT conflict with self
    const selfConflict = await findConflict(prisma, {
      resourceId: testResource.id,
      startTime: newStart,
      endTime: newEnd,
      excludeReservationId: createdReservationId,
    });
    assert(!selfConflict, "Reservation UPDATE: Self-exclusion allows rescheduling without conflicting with self");

    const updatedReservation = await prisma.reservation.update({
      where: { id: createdReservationId },
      data: {
        title: "Architecture Deep-Dive Session (Rescheduled)",
        startTime: newStart,
        endTime: newEnd,
        notes: "[AUTO_RELEASE_ENABLED] Rescheduled to 4:00 PM",
      },
    });

    assert(updatedReservation.title === "Architecture Deep-Dive Session (Rescheduled)", "Reservation UPDATE: Title and timeslot updated in PostgreSQL");
    assert(new Date(updatedReservation.startTime).getTime() === newStart.getTime(), "Reservation UPDATE: Start time updated correctly");

    // 2.5 CANCEL RESERVATION (Soft delete / status transition)
    const cancellationReason = "Executive team meeting rescheduled to next quarter";
    const cancelledReservation = await prisma.reservation.update({
      where: { id: createdReservationId },
      data: {
        status: ReservationStatus.CANCELLED,
        notes: `${updatedReservation.notes} [CANCEL_REASON:${cancellationReason}]`,
      },
    });

    assert(cancelledReservation.status === ReservationStatus.CANCELLED, "Reservation CANCEL: Status changed to CANCELLED in PostgreSQL");
    assert(cancelledReservation.notes?.includes(cancellationReason), "Reservation CANCEL: Cancellation reason persisted in notes");

    // Verify slot is immediately free after cancellation
    const postCancelConflict = await findConflict(prisma, {
      resourceId: testResource.id,
      startTime: newStart,
      endTime: newEnd,
    });
    assert(!postCancelConflict, "Reservation CANCEL: Freeing slot allows immediate re-booking by other users");

    // 2.6 HARD DELETE RESERVATION (Cleanup)
    const deletedReservation = await prisma.reservation.delete({
      where: { id: createdReservationId },
    });
    assert(Boolean(deletedReservation.id), "Reservation DELETE: Successfully hard-deleted test reservation from PostgreSQL");

    // 1.5 HARD DELETE USER (Cleanup)
    const deletedUser = await prisma.user.delete({
      where: { id: createdUserId },
    });
    assert(Boolean(deletedUser.id), "User DELETE: Successfully hard-deleted test user from PostgreSQL");

  } catch (error: any) {
    console.error("Test execution failed with error:", error);
    testFailed++;
  } finally {
    // Failsafe cleanup in case of unexpected errors
    try {
      if (createdReservationId) {
        await prisma.reservation.deleteMany({ where: { id: createdReservationId } });
      }
      if (createdUserId) {
        await prisma.user.deleteMany({ where: { id: createdUserId } });
      }
    } catch {}

    await prisma.$disconnect();

    console.log("\n========================================================");
    console.log(` 🏁 RESULT: ${testPassed} Passed, ${testFailed} Failed`);
    console.log("========================================================\n");

    if (testFailed > 0) {
      process.exit(1);
    }
  }
}

runDatabaseCrudVerification();
