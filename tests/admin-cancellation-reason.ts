import { parseCheckInStatus, parseCancellationReason } from "../src/lib/ghost-booking";
import prisma from "../src/lib/db";
import { ReservationStatus } from "@prisma/client";

async function runCancellationTestSuite() {
  console.log("\n========================================================");
  console.log(" 🛡️ PRIMEWAWE LAB: ADMIN CANCELLATION REASON TEST SUITE");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(` ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    // Test 1: parseCancellationReason with empty string / null
    const emptyResult = parseCancellationReason(null);
    assert(!emptyResult.isCancelledByAdmin && !emptyResult.reason, "Test 1: Returns clean defaults on null notes");

    // Test 2: parseCancellationReason extracts admin cancellation reason
    const sampleNotes = "Client kick-off prep [CANCELLED_BY_ADMIN:Admin User] [REASON:Urgent facility maintenance or technical repairs]";
    const parsedAdminCancel = parseCancellationReason(sampleNotes);
    assert(
      parsedAdminCancel.isCancelledByAdmin === true &&
      parsedAdminCancel.cancelledBy === "Admin User" &&
      parsedAdminCancel.reason === "Urgent facility maintenance or technical repairs",
      "Test 2: Correctly parses admin name and justification reason"
    );

    // Test 3: cleanNotes in parseCheckInStatus removes the internal metadata tags
    const checkInStatus = parseCheckInStatus(sampleNotes);
    assert(
      checkInStatus.cleanNotes === "Client kick-off prep",
      `Test 3: cleanNotes cleanly removes all cancellation metadata tags (result: '${checkInStatus.cleanNotes}')`
    );

    // Test 4: User cancellation with reason
    const userCancelNotes = "[CANCEL_REASON:Meeting moved to Google Meet]";
    const parsedUserCancel = parseCancellationReason(userCancelNotes);
    assert(
      parsedUserCancel.isCancelledByAdmin === false &&
      parsedUserCancel.reason === "Meeting moved to Google Meet",
      "Test 4: Correctly handles standard user self-cancellation reason"
    );

    // Test 5: End-to-end DB reservation lifecycle with admin cancellation
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const employeeUser = await prisma.user.findFirst({ where: { role: "USER" } });
    const resource = await prisma.resource.findFirst({ where: { status: "ACTIVE" } });

    if (adminUser && employeeUser && resource) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const start = new Date(tomorrow.setHours(14, 0, 0, 0));
      const end = new Date(tomorrow.setHours(15, 0, 0, 0));

      const reservation = await prisma.reservation.create({
        data: {
          title: "Quarterly Review Test Booking",
          startTime: start,
          endTime: end,
          userId: employeeUser.id,
          resourceId: resource.id,
          status: ReservationStatus.CONFIRMED,
          notes: "Need projector and conference mic",
        },
      });

      // Admin cancels with reason
      const cancelReason = "Room reallocated for urgent board meeting";
      const updatedNotes = `${reservation.notes ? reservation.notes + " " : ""}[CANCELLED_BY_ADMIN:${adminUser.name}] [REASON:${cancelReason}]`;

      const cancelled = await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: ReservationStatus.CANCELLED,
          notes: updatedNotes,
        },
      });

      const parsedDB = parseCancellationReason(cancelled.notes);
      assert(
        cancelled.status === ReservationStatus.CANCELLED &&
        parsedDB.isCancelledByAdmin &&
        parsedDB.cancelledBy === adminUser.name &&
        parsedDB.reason === cancelReason,
        "Test 5: Cancelled booking in DB retains admin name and cancellation reason for the employee"
      );

      // Clean up test reservation
      await prisma.reservation.delete({ where: { id: reservation.id } });
      console.log("\n🧹 Test cleanup complete.");
    }

  } catch (err: any) {
    console.error("Test failed with error:", err);
    failed++;
  }

  console.log("\n========================================================");
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  if (failed > 0) process.exit(1);
}

runCancellationTestSuite();
