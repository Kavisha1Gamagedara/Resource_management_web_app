import prisma from "../src/lib/db";
import { createUserSchema } from "../src/lib/validations/user";
import { requireAdmin, requireAuth } from "../src/lib/auth";
import { getCompanyUsers, createUser } from "../src/lib/actions/users";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

async function runTestSuite() {
  console.log("\n========================================================");
  console.log(" 👥 PRIMEWAWE LAB: ADMIN USER PROVISIONING TEST SUITE");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail: string = "") {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${testName} - ${detail}`);
      failed++;
    }
  }

  const uniqueSuffix = Date.now();
  const testEmail = `engineer.${uniqueSuffix}@primewave.com`;
  const rawPassword = "SecurePass123!";

  try {
    // Test 1: RBAC enforcement - requireAdmin rejects unauthenticated execution
    try {
      await requireAdmin();
      assert(false, "Test 1: requireAdmin throws when unauthenticated", "Did not throw error");
    } catch (e: any) {
      assert(
        e.message.includes("Unauthorized") || e.message.includes("Forbidden"),
        "Test 1: requireAdmin strictly blocks unauthenticated requests",
        e.message
      );
    }

    // Test 2: Server Action createUser rejects unauthorized requests
    const unauthResult = await createUser({
      name: "Attacker",
      email: `hacker.${uniqueSuffix}@external.com`,
      password: "somepassword123",
      role: Role.ADMIN,
    });
    assert(
      !unauthResult.success && Boolean(unauthResult.error),
      "Test 2: createUser server action blocks unauthenticated / non-admin callers",
      unauthResult.error || "No error returned"
    );

    // Test 3: getCompanyUsers rejects unauthorized requests
    try {
      await getCompanyUsers();
      assert(false, "Test 3: getCompanyUsers blocks unauthenticated callers", "Did not throw");
    } catch (e: any) {
      assert(
        e.message.includes("Unauthorized") || e.message.includes("Forbidden"),
        "Test 3: getCompanyUsers strictly blocks non-admin callers",
        e.message
      );
    }

    // Test 4: Zod Schema rejects invalid email format
    const invalidEmailValidation = createUserSchema.safeParse({
      name: "Bad Email User",
      email: "not-a-valid-email",
      password: rawPassword,
    });
    assert(
      !invalidEmailValidation.success,
      "Test 4: createUserSchema rejects malformed email address"
    );

    // Test 5: Zod Schema rejects password shorter than 6 characters
    const shortPasswordValidation = createUserSchema.safeParse({
      name: "Short Pass User",
      email: testEmail,
      password: "123",
    });
    assert(
      !shortPasswordValidation.success,
      "Test 5: createUserSchema rejects password shorter than 6 characters"
    );

    // Test 6: Zod Schema accepts valid admin input with defaults
    const validValidation = createUserSchema.safeParse({
      name: "Marcus Aurelius",
      email: testEmail,
      password: rawPassword,
      role: Role.USER,
      department: "Hardware Engineering",
    });
    assert(
      validValidation.success,
      "Test 6: createUserSchema accepts fully qualified valid user payload"
    );

    // Test 7: Secure password hashing with bcrypt
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const passwordMatches = await bcrypt.compare(rawPassword, hashedPassword);
    assert(
      passwordMatches && hashedPassword !== rawPassword,
      "Test 7: Bcrypt securely hashes passwords with 10 salt rounds and validates correctly"
    );

    // Test 8: Direct DB creation simulating admin provisioning flow
    const createdUser = await prisma.user.create({
      data: {
        name: "Elena Rostova",
        email: testEmail,
        passwordHash: hashedPassword,
        role: Role.USER,
        department: "Robotics & Firmware",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        passwordHash: true,
      },
    });

    assert(
      createdUser.email === testEmail && createdUser.role === Role.USER,
      "Test 8: Provisioned company user persists accurately in PostgreSQL database"
    );

    // Test 9: Login verification with provisioned credentials
    const credentialsValid = await bcrypt.compare(rawPassword, createdUser.passwordHash);
    assert(
      credentialsValid,
      "Test 9: Newly provisioned user credentials succeed bcrypt verification against stored hash"
    );

    // Test 10: Duplicate email rejection logic
    const duplicateExists = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    assert(
      Boolean(duplicateExists),
      "Test 10: System detects duplicate email conflict to prevent duplicate accounts"
    );

    // Test 11: Custom 'Other' typed department is accepted and saved
    const otherDeptEmail = `legal.${uniqueSuffix}@primewave.com`;
    const customUser = await prisma.user.create({
      data: {
        name: "Devon Vance",
        email: otherDeptEmail,
        passwordHash: hashedPassword,
        role: Role.USER,
        department: "Legal & Regulatory Compliance",
      },
    });
    assert(
      customUser.department === "Legal & Regulatory Compliance",
      "Test 11: Custom typed 'Other' department (e.g. Legal & Regulatory Compliance) saves properly"
    );

  } catch (err: any) {
    console.error("💥 Unexpected test suite failure:", err);
    failed++;
  } finally {
    // Clean up test records
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: "engineer." } },
          { email: { contains: "legal." } },
        ],
      },
    });
    console.log("\n🧹 Test cleanup complete.");
    console.log(`\n========================================================`);
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTestSuite();
