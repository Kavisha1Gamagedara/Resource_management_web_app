import { PrismaClient, ResourceStatus, ReservationStatus } from "@prisma/client";
import { findConflict, hasTimeOverlap, formatConflictMessage, findSmartAlternatives } from "../src/lib/booking-engine";

const prisma = new PrismaClient();

async function runTurnaroundBufferTests() {
  console.log("\n========================================================");
  console.log(" 🧹 PRIMEWAWE LAB: TURNAROUND & BUFFER TIME TEST SUITE");
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

  try {
    // 1. Setup test user & category
    let user = await prisma.user.findFirst();
    let category = await prisma.category.findFirst();

    if (!user || !category) {
      user = await prisma.user.create({
        data: {
          email: "turnaround.test@primewave.com",
          name: "Turnaround Tester",
          passwordHash: "dummy",
        },
      });
      category = await prisma.category.create({
        data: {
          slug: "turnaround-category",
          name: "Turnaround Test Category",
        },
      });
    }

    // 2. Resource with 15-minute turnaround buffer
    const bufferedResource = await prisma.resource.create({
      data: {
        name: `Buffered Room ${Date.now()}`,
        categoryId: category.id,
        location: "Level 4, Clean Room",
        status: ResourceStatus.ACTIVE,
        attributes: {
          bufferMinutes: 15,
          notice: "15-minute sanitization & turnaround required between meetings",
        },
      },
    });

    // 3. Resource without turnaround buffer (standard back-to-back)
    const zeroBufferResource = await prisma.resource.create({
      data: {
        name: `Zero Buffer Pod ${Date.now()}`,
        categoryId: category.id,
        location: "Level 1, Quick Focus",
        status: ResourceStatus.ACTIVE,
        attributes: {},
      },
    });

    // Evergreen timestamp in future (5 days ahead)
    const testDay = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    testDay.setHours(0, 0, 0, 0);

    const makeTime = (h: number, m: number) => {
      const d = new Date(testDay);
      d.setHours(h, m, 0, 0);
      return d;
    };

    // TEST 1: Base reservation [10:00 - 11:00] on buffered resource
    const baseStart = makeTime(10, 0);
    const baseEnd = makeTime(11, 0);

    const baseReservation = await prisma.reservation.create({
      data: {
        title: "Sprint Review Session",
        resourceId: bufferedResource.id,
        userId: user.id,
        startTime: baseStart,
        endTime: baseEnd,
        status: ReservationStatus.CONFIRMED,
      },
    });

    assert(Boolean(baseReservation.id), "Test 1: Base reservation [10:00 - 11:00] created on buffered resource");

    // TEST 2: Consecutive booking with 0 gap [11:00 - 12:00]
    // Violates the 15-minute turnaround buffer (EffectiveEnd of base booking is 11:15)
    const backToBackConflict = await findConflict(prisma, {
      resourceId: bufferedResource.id,
      startTime: makeTime(11, 0),
      endTime: makeTime(12, 0),
    });

    assert(
      backToBackConflict !== null && (backToBackConflict as any).isBufferConflict === true,
      "Test 2: Consecutive booking with 0 gap [11:00 - 12:00] is REJECTED by turnaround buffer",
      "Expected buffer conflict to be detected"
    );

    // TEST 3: Conflict message formatting specifically describes Turnaround Buffer
    const conflictMsg = formatConflictMessage(backToBackConflict as any);
    assert(
      conflictMsg.includes("Turnaround Buffer Conflict") && conflictMsg.includes("15-minute"),
      "Test 3: Conflict message clearly explains mandatory 15-minute turnaround buffer",
      `Received message: ${conflictMsg}`
    );

    // TEST 4: Booking respecting the 15-minute buffer [11:15 - 12:15] is ACCEPTED
    const validBufferedConflict = await findConflict(prisma, {
      resourceId: bufferedResource.id,
      startTime: makeTime(11, 15),
      endTime: makeTime(12, 15),
    });

    assert(
      validBufferedConflict === null,
      "Test 4: Post-buffer booking [11:15 - 12:15] is valid and ACCEPTED",
      "Expected null conflict when 15-min turnaround buffer is satisfied"
    );

    // TEST 5: Direct overlapping booking [10:30 - 11:30]
    // Direct overlap should flag standard conflict (isBufferConflict: false)
    const directConflict = await findConflict(prisma, {
      resourceId: bufferedResource.id,
      startTime: makeTime(10, 30),
      endTime: makeTime(11, 30),
    });

    assert(
      directConflict !== null && (directConflict as any).isBufferConflict === false,
      "Test 5: Direct meeting overlap [10:30 - 11:30] flags direct conflict (isBufferConflict: false)",
      "Expected direct collision"
    );

    // TEST 6: Prior booking [09:00 - 10:00] ending at 10:00 without buffer before base meeting
    // Base meeting starts at 10:00, so prior meeting needs 15 min buffer (ending at 09:45 or earlier)
    const priorZeroGapConflict = await findConflict(prisma, {
      resourceId: bufferedResource.id,
      startTime: makeTime(9, 0),
      endTime: makeTime(10, 0),
    });

    assert(
      priorZeroGapConflict !== null && (priorZeroGapConflict as any).isBufferConflict === true,
      "Test 6: Prior meeting [09:00 - 10:00] violates pre-meeting turnaround buffer and is REJECTED",
      "Expected pre-meeting buffer collision"
    );

    // TEST 7: Prior meeting respecting turnaround buffer [08:45 - 09:45]
    const validPriorConflict = await findConflict(prisma, {
      resourceId: bufferedResource.id,
      startTime: makeTime(8, 45),
      endTime: makeTime(9, 45),
    });

    assert(
      validPriorConflict === null,
      "Test 7: Prior meeting [08:45 - 09:45] ending 15 min before base booking is ACCEPTED",
      "Expected valid slot when 15-min gap precedes base meeting"
    );

    // TEST 8: Zero-buffer resource allows back-to-back booking [11:00 - 12:00]
    const zeroBufferBase = await prisma.reservation.create({
      data: {
        title: "Standard Quick Chat",
        resourceId: zeroBufferResource.id,
        userId: user.id,
        startTime: makeTime(10, 0),
        endTime: makeTime(11, 0),
        status: ReservationStatus.CONFIRMED,
      },
    });

    const zeroBufferAdjacentConflict = await findConflict(prisma, {
      resourceId: zeroBufferResource.id,
      startTime: makeTime(11, 0),
      endTime: makeTime(12, 0),
    });

    assert(
      zeroBufferAdjacentConflict === null,
      "Test 8: Resource without turnaround buffer allows 0-gap back-to-back booking [11:00 - 12:00]",
      "Expected adjacent booking to succeed when bufferMinutes is 0"
    );

    // TEST 9: Smart alternatives on buffered resource suggest next slot at 11:15 (incorporating 15m buffer)
    const suggestions = await findSmartAlternatives(prisma, {
      resourceId: bufferedResource.id,
      startTime: makeTime(10, 30),
      endTime: makeTime(11, 30),
    });

    const suggestedStart = suggestions.nextAvailableSlot ? new Date(suggestions.nextAvailableSlot.startTime) : null;
    const suggestedMinutes = suggestedStart ? suggestedStart.getMinutes() : -1;
    const suggestedHours = suggestedStart ? suggestedStart.getHours() : -1;

    assert(
      suggestedHours === 11 && suggestedMinutes === 15,
      "Test 9: Smart alternatives engine suggests next available slot at 11:15 AM (incorporating 15-min buffer)",
      `Suggested start was ${suggestedHours}:${suggestedMinutes}`
    );

    // TEST 10: Self-exclusion on reschedule preserves buffer logic without false self-collision
    const selfRescheduleConflict = await findConflict(prisma, {
      resourceId: bufferedResource.id,
      startTime: makeTime(10, 0),
      endTime: makeTime(11, 0),
      excludeReservationId: baseReservation.id,
    });

    assert(
      selfRescheduleConflict === null,
      "Test 10: Self-exclusion during reservation update ignores own buffer and allows saving",
      "Expected self-exclusion to bypass own reservation"
    );

  } catch (error) {
    console.error("Test execution failed with error:", error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n========================================================");
  console.log(` 🏁 RESULT: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) process.exit(1);
}

runTurnaroundBufferTests();
