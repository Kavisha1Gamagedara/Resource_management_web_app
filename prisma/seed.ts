import { PrismaClient, Role, ResourceStatus, ReservationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data in reverse order of foreign key dependencies
  await prisma.reservation.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned up existing database records.");

  // 1. Create Users
  const adminPasswordHash = bcrypt.hashSync("admin123", 10);
  const userPasswordHash = bcrypt.hashSync("user123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@primewave.com",
      name: "Admin User",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      department: "Operations",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: "sarah@primewave.com",
      name: "Sarah Perera",
      passwordHash: userPasswordHash,
      role: Role.USER,
      department: "Engineering",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    },
  });

  const alex = await prisma.user.create({
    data: {
      email: "alex@primewave.com",
      name: "Alex Fernando",
      passwordHash: userPasswordHash,
      role: Role.USER,
      department: "Product",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
  });

  const emily = await prisma.user.create({
    data: {
      email: "emily@primewave.com",
      name: "Emily Chen",
      passwordHash: userPasswordHash,
      role: Role.USER,
      department: "Design",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    },
  });

  const david = await prisma.user.create({
    data: {
      email: "david@primewave.com",
      name: "David Silva",
      passwordHash: userPasswordHash,
      role: Role.USER,
      department: "Hardware",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    },
  });

  console.log(`👤 Created ${5} users (1 Admin, 4 Team Members).`);

  // 2. Create Categories
  const catRooms = await prisma.category.create({
    data: {
      name: "Meeting Rooms",
      slug: "meeting-rooms",
      description: "Acoustically treated conference and focus rooms with collaboration screens and A/V equipment",
    },
  });

  const catAV = await prisma.category.create({
    data: {
      name: "A/V & Media Gear",
      slug: "av-gear",
      description: "High-end cameras, wireless audio, studio lighting, and video podcasting equipment",
    },
  });

  const catLab = await prisma.category.create({
    data: {
      name: "Lab Benches & Hardware",
      slug: "lab-benches",
      description: "Electronics testing stations, oscilloscopes, soldering tools, and 3D printing equipment",
    },
  });

  const catVehicles = await prisma.category.create({
    data: {
      name: "Company Fleet",
      slug: "company-fleet",
      description: "Shared company vehicles for client visits, team transport, and equipment transport",
    },
  });

  console.log(`📂 Created 4 resource categories.`);

  // 3. Create Resources
  const roomAlpha = await prisma.resource.create({
    data: {
      name: "Conference Room Alpha",
      description: "Flagship boardroom equipped for hybrid team meetings and client presentations.",
      categoryId: catRooms.id,
      location: "Floor 2, West Wing",
      capacity: 14,
      status: ResourceStatus.ACTIVE,
      attributes: {
        screen: "75-inch 4K Display",
        videoSystem: "Logitech Rally Bar",
        whiteboard: true,
        airConditioning: true,
        bufferMinutes: 15,
      },
    },
  });

  const roomBeta = await prisma.resource.create({
    data: {
      name: "Focus Pod Beta",
      description: "Quiet sound-insulated room ideal for 1-on-1s, interviews, and deep focus sessions.",
      categoryId: catRooms.id,
      location: "Floor 2, Quiet Zone",
      capacity: 4,
      status: ResourceStatus.ACTIVE,
      attributes: {
        screen: "43-inch Monitor",
        whiteboard: true,
        acousticRating: "Soundproofed (Class A)",
      },
    },
  });

  const roomExecutive = await prisma.resource.create({
    data: {
      name: "Executive Ocean Boardroom",
      description: "Premium conference room for board meetings, partner summits, and all-hands streams.",
      categoryId: catRooms.id,
      location: "Floor 3, Executive Suite",
      capacity: 22,
      status: ResourceStatus.ACTIVE,
      attributes: {
        screen: "Dual 85-inch 4K Displays",
        videoSystem: "Poly Studio E70 + Ceiling Mic Array",
        refreshmentsCounter: true,
        bufferMinutes: 15,
      },
    },
  });

  const roomRenovating = await prisma.resource.create({
    data: {
      name: "Conference Room Gamma",
      description: "Currently decommissioned for acoustic baffling upgrades and audio reconfiguration.",
      categoryId: catRooms.id,
      location: "Floor 1, East Hall",
      capacity: 8,
      status: ResourceStatus.INACTIVE,
      attributes: {
        notice: "Deactivated for Q4 Facility Redesign",
      },
    },
  });

  const sonyCamera = await prisma.resource.create({
    data: {
      name: "Sony FX3 Cinema Camera Kit",
      description: "Full-frame cinema line camera with 24-70mm f/2.8 GM II lens, shotgun mic, and audio handle.",
      categoryId: catAV.id,
      location: "Media Locker A-04",
      capacity: null,
      status: ResourceStatus.ACTIVE,
      attributes: {
        sensor: "Full-frame 4K 120p",
        batteries: 4,
        cards: "2x 160GB CFexpress Type A",
        tripod: "Manfrotto 504X Video Head",
      },
    },
  });

  const podcastKit = await prisma.resource.create({
    data: {
      name: "Studio Podcast Broadcast Station",
      description: "Dual microphone broadcast setup for webinar recordings and executive podcasting.",
      categoryId: catAV.id,
      location: "Studio Room 102",
      capacity: 2,
      status: ResourceStatus.ACTIVE,
      attributes: {
        microphones: "2x Shure SM7B + Cloudlifters",
        mixer: "RODECaster Pro II",
        headphones: "2x Audio-Technica ATH-M50x",
      },
    },
  });

  const oscBench = await prisma.resource.create({
    data: {
      name: "RF & Oscilloscope Workbench #1",
      description: "High-precision testing workstation for hardware prototyping and firmware debugging.",
      categoryId: catLab.id,
      location: "Hardware Lab 1, Bench 3",
      capacity: 2,
      status: ResourceStatus.ACTIVE,
      attributes: {
        oscilloscope: "Keysight InfiniVision 500MHz 4-Ch",
        powerSupply: "Rigol DP832 Triple-Output",
        multimeter: "Fluke 87V",
        soldering: "Hakko FX-888D ESD Station",
      },
    },
  });

  const printer3D = await prisma.resource.create({
    data: {
      name: "Formlabs Form 3+ SLA 3D Printer",
      description: "Industrial precision stereolithography 3D printer for mechanical housing prototypes.",
      categoryId: catLab.id,
      location: "Prototyping Workshop",
      capacity: 1,
      status: ResourceStatus.ACTIVE,
      attributes: {
        buildVolume: "14.5 x 14.5 x 18.5 cm",
        resin: "Draft Resin & Tough 2000",
        curingUnit: "Form Cure & Wash Included",
      },
    },
  });

  const tesla = await prisma.resource.create({
    data: {
      name: "Tesla Model Y (Fleet #1)",
      description: "All-electric compact SUV available for official client meetings and business travel.",
      categoryId: catVehicles.id,
      location: "Basement Parking B-12",
      capacity: 5,
      status: ResourceStatus.ACTIVE,
      attributes: {
        range: "450 km WLTP",
        powertrain: "Dual Motor AWD",
        chargingPass: "Included in glovebox",
        bufferMinutes: 30,
      },
    },
  });

  const van = await prisma.resource.create({
    data: {
      name: "Toyota HiAce Transport Van",
      description: "High-roof utility van for transporting hardware and event booths. Currently scheduled for service.",
      categoryId: catVehicles.id,
      location: "Basement Parking B-15",
      capacity: 10,
      status: ResourceStatus.MAINTENANCE,
      attributes: {
        scheduledMaintenance: "Brake service and inspection",
        availableDate: "Next Monday",
      },
    },
  });

  console.log(`🏢 Created 10 realistic resources across 4 categories.`);

  // 4. Create Pre-populated Reservations anchored to Today and Tomorrow
  const now = new Date();
  
  // Helper to construct Date objects at specific hours for Today
  const getTodayTime = (hours: number, minutes = 0) => {
    const d = new Date(now);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  // Helper for Tomorrow
  const getTomorrowTime = (hours: number, minutes = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  await prisma.reservation.createMany({
    data: [
      {
        title: "Sprint Planning & Backlog Grooming",
        notes: "Engineering team bi-weekly sprint planning session.",
        startTime: getTodayTime(9, 30),
        endTime: getTodayTime(11, 0),
        status: ReservationStatus.CONFIRMED,
        resourceId: roomAlpha.id,
        userId: sarah.id,
      },
      {
        title: "Client Architecture Review with Enterprise Stakeholders",
        notes: "Presenting the new cloud migration roadmap and SLA guarantees.",
        startTime: getTodayTime(13, 30),
        endTime: getTodayTime(15, 0),
        status: ReservationStatus.CONFIRMED,
        resourceId: roomAlpha.id,
        userId: alex.id,
      },
      {
        title: "Executive Strategic Operations Review",
        notes: "Quarterly budget allocations and staffing review.",
        startTime: getTodayTime(10, 0),
        endTime: getTodayTime(12, 0),
        status: ReservationStatus.CONFIRMED,
        resourceId: roomExecutive.id,
        userId: admin.id,
      },
      {
        title: "Product Launch Promotional Video Shoot",
        notes: "Recording testimonial interviews and product B-roll footage.",
        startTime: getTodayTime(10, 30),
        endTime: getTodayTime(14, 0),
        status: ReservationStatus.CONFIRMED,
        resourceId: sonyCamera.id,
        userId: emily.id,
      },
      {
        title: "ESP32 Firmware Power Consumption Analysis",
        notes: "Validating sleep cycle power draw on battery-operated sensors.",
        startTime: getTodayTime(14, 0),
        endTime: getTodayTime(17, 30),
        status: ReservationStatus.CONFIRMED,
        resourceId: oscBench.id,
        userId: david.id,
      },
      {
        title: "Design System Figma Sync & Component Review",
        notes: "Aligning frontend components with new Figma token standards.",
        startTime: getTomorrowTime(10, 0),
        endTime: getTomorrowTime(11, 30),
        status: ReservationStatus.CONFIRMED,
        resourceId: roomBeta.id,
        userId: emily.id,
      },
      {
        title: "On-site Client Infrastructure Audit",
        notes: "Transporting hardware diagnostic tools to Colombo datacenter.",
        startTime: getTomorrowTime(13, 0),
        endTime: getTomorrowTime(17, 0),
        status: ReservationStatus.CONFIRMED,
        resourceId: tesla.id,
        userId: alex.id,
      },
    ],
  });

  console.log(`📅 Created 7 pre-populated reservations for today and tomorrow.`);
  console.log("✨ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during database seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
