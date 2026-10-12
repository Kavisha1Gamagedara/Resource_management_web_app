import { PrismaClient, Role, ResourceStatus, ReservationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, setHours, setMinutes, startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting PrimeWave database seed...");

  // 1. Password hash for demo users
  const defaultPasswordHash = await bcrypt.hash("password123", 10);
  const adminPasswordHash = await bcrypt.hash("admin123", 10);

  // 2. Upsert Users
  const usersData = [
    {
      email: "admin@primewave.com",
      name: "Admin User",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      department: "IT & Operations",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
    {
      email: "sarah@primewave.com",
      name: "Sarah Perera",
      passwordHash: defaultPasswordHash,
      role: Role.USER,
      department: "Engineering",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    },
    {
      email: "alex@primewave.com",
      name: "Alex Fernando",
      passwordHash: defaultPasswordHash,
      role: Role.USER,
      department: "Product Management",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
    {
      email: "priyantha@primewave.com",
      name: "Priyantha Dias",
      passwordHash: defaultPasswordHash,
      role: Role.USER,
      department: "Design & UX",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    },
    {
      email: "dilani@primewave.com",
      name: "Dilani Silva",
      passwordHash: defaultPasswordHash,
      role: Role.USER,
      department: "Client Solutions",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    },
  ];

  const createdUsers: Record<string, string> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        department: u.department,
        avatarUrl: u.avatarUrl,
        passwordHash: u.passwordHash,
      },
      create: u,
    });
    createdUsers[u.email] = user.id;
  }
  console.log(`✅ Seeded ${Object.keys(createdUsers).length} users.`);

  // 3. Upsert Categories
  const categoriesData = [
    {
      slug: "meeting-rooms",
      name: "Meeting Rooms",
      description: "Collaborative meeting spaces, executive boardrooms, and focus pods.",
    },
    {
      slug: "av-equipment",
      name: "Audio & Visual Gear",
      description: "Professional cameras, wireless mics, portable projectors, and lighting rigs.",
    },
    {
      slug: "labs-desks",
      name: "Engineering Labs & Tech Desks",
      description: "Dedicated hardware testing benches, VR labs, and specialized test rigs.",
    },
    {
      slug: "vehicles-transport",
      name: "Vehicles & Transport",
      description: "Company cars and logistics vans for site visits and client transit.",
    },
  ];

  const createdCategories: Record<string, string> = {};
  for (const c of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
      },
      create: c,
    });
    createdCategories[c.slug] = category.id;
  }
  console.log(`✅ Seeded ${Object.keys(createdCategories).length} categories.`);

  // 4. Upsert Resources
  const resourcesData = [
    {
      name: "Main Boardroom (Alpha)",
      description: "Spacious executive boardroom with 4K video conferencing and dual presentation displays.",
      categorySlug: "meeting-rooms",
      location: "Floor 4, North Wing",
      capacity: 20,
      status: ResourceStatus.ACTIVE,
      attributes: {
        display: "85-inch 4K HDR",
        videoConf: "Poly Studio X50",
        whiteboard: true,
        coffeeStation: true,
      },
    },
    {
      name: "Brainstorming Pod B",
      description: "Interactive team brainstorming room equipped with digital whiteboard and lounge seating.",
      categorySlug: "meeting-rooms",
      location: "Floor 2, Central Hub",
      capacity: 6,
      status: ResourceStatus.ACTIVE,
      attributes: {
        display: "55-inch Touchscreen",
        whiteboard: true,
        standingTable: true,
      },
    },
    {
      name: "Focus Room 1",
      description: "Soundproof single/duo booth designed for focused work, 1-on-1s, or private video calls.",
      categorySlug: "meeting-rooms",
      location: "Floor 2, East Corridor",
      capacity: 2,
      status: ResourceStatus.ACTIVE,
      attributes: {
        soundproof: true,
        dualMonitors: true,
        ringLight: true,
      },
    },
    {
      name: "Sony FX3 Cinema Camera Kit",
      description: "Full-frame 4K camera rig with 24-70mm f/2.8 lens, 2x batteries, and carbon tripod.",
      categorySlug: "av-equipment",
      location: "A/V Storage Locker 102",
      capacity: null,
      status: ResourceStatus.ACTIVE,
      attributes: {
        serial: "SN-FX3-88210",
        accessories: ["24-70mm Lens", "Dual SD Cards (128GB)", "Carbon Tripod", "Cage"],
      },
    },
    {
      name: "DJI Mic 2 Dual Wireless Audio",
      description: "2-person wireless transmitter set with 32-bit float internal recording and charging case.",
      categorySlug: "av-equipment",
      location: "A/V Storage Locker 104",
      capacity: null,
      status: ResourceStatus.ACTIVE,
      attributes: {
        serial: "SN-DJI-4419",
        channels: 2,
        batteryHours: 18,
      },
    },
    {
      name: "Epson 4K Laser Projector",
      description: "Portable 5,000 lumens high-brightness laser projector for all-hands demos and presentations.",
      categorySlug: "av-equipment",
      location: "Cabinet B, Presentation Storeroom",
      capacity: null,
      status: ResourceStatus.ACTIVE,
      attributes: {
        lumens: 5000,
        connectivity: ["HDMI", "USB-C", "AirPlay"],
      },
    },
    {
      name: "Hardware Prototyping Bench #3",
      description: "Lab bench with digital oscilloscope, Weller soldering station, and benchtop DC power supply.",
      categorySlug: "labs-desks",
      location: "Hardware Engineering Lab, Rm 105",
      capacity: 2,
      status: ResourceStatus.ACTIVE,
      attributes: {
        equipment: ["Rigol 100MHz Oscilloscope", "Dual DC Power Supply", "Soldering Station"],
        safetyGogglesProvided: true,
      },
    },
    {
      name: "VR Testing Station (Meta Quest 3)",
      description: "Clearance area with high-spec VR workstation and Meta Quest 3 developer kit.",
      categorySlug: "labs-desks",
      location: "R&D Lab, Room 208",
      capacity: 1,
      status: ResourceStatus.MAINTENANCE,
      attributes: {
        gpu: "RTX 4080",
        headset: "Meta Quest 3 512GB",
        note: "Headset strap under maintenance until tomorrow morning",
      },
    },
    {
      name: "Toyota Prius (Company Hybrid - WP CAB-4512)",
      description: "Fuel-efficient company hybrid car for client visits and local business errands.",
      categorySlug: "vehicles-transport",
      location: "Basement Parking Bay B-04",
      capacity: 5,
      status: ResourceStatus.ACTIVE,
      attributes: {
        licensePlate: "WP CAB-4512",
        transmission: "Automatic",
        fuelType: "Petrol Hybrid",
        mileagePolicy: "Full-to-full fuel policy",
      },
    },
    {
      name: "Nissan NV200 Cargo Van (WP CAS-8821)",
      description: "High-capacity logistics van for equipment transfer and event production transport.",
      categorySlug: "vehicles-transport",
      location: "Loading Dock 2",
      capacity: 2,
      status: ResourceStatus.ACTIVE,
      attributes: {
        licensePlate: "WP CAS-8821",
        payloadKg: 750,
        cargoVolumeM3: 4.2,
      },
    },
  ];

  const createdResources: Record<string, string> = {};
  for (const r of resourcesData) {
    const categoryId = createdCategories[r.categorySlug];
    const existing = await prisma.resource.findFirst({
      where: { name: r.name },
    });

    if (existing) {
      const updated = await prisma.resource.update({
        where: { id: existing.id },
        data: {
          description: r.description,
          location: r.location,
          capacity: r.capacity,
          status: r.status,
          attributes: r.attributes,
          categoryId,
        },
      });
      createdResources[r.name] = updated.id;
    } else {
      const created = await prisma.resource.create({
        data: {
          name: r.name,
          description: r.description,
          location: r.location,
          capacity: r.capacity,
          status: r.status,
          attributes: r.attributes,
          categoryId,
        },
      });
      createdResources[r.name] = created.id;
    }
  }
  console.log(`✅ Seeded ${Object.keys(createdResources).length} resources.`);

  // 5. Seed Reservations (dynamic timestamps around today and tomorrow)
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  const sampleReservations = [
    // Today: Boardroom
    {
      title: "Executive Sprint Planning",
      notes: "Bi-weekly sprint planning meeting with full tech leads and design team.",
      resourceName: "Main Boardroom (Alpha)",
      userEmail: "sarah@primewave.com",
      startTime: setMinutes(setHours(today, 9), 0),   // 09:00 AM
      endTime: setMinutes(setHours(today, 11), 0),    // 11:00 AM
      status: ReservationStatus.CONFIRMED,
    },
    {
      title: "Client Architecture Review",
      notes: "Architecture presentation with overseas client stakeholders.",
      resourceName: "Main Boardroom (Alpha)",
      userEmail: "alex@primewave.com",
      startTime: setMinutes(setHours(today, 14), 0),  // 02:00 PM
      endTime: setMinutes(setHours(today, 15), 30),  // 03:30 PM
      status: ReservationStatus.CONFIRMED,
    },
    // Today: Brainstorming Pod B
    {
      title: "UX Flow Ideation",
      notes: "Sketching mobile wireframes on the interactive whiteboard.",
      resourceName: "Brainstorming Pod B",
      userEmail: "priyantha@primewave.com",
      startTime: setMinutes(setHours(today, 10), 30), // 10:30 AM
      endTime: setMinutes(setHours(today, 12), 0),   // 12:00 PM
      status: ReservationStatus.CONFIRMED,
    },
    // Today: Camera kit
    {
      title: "Product Video Shoot - Case Study",
      notes: "Filming customer testimonial video in conference room 3.",
      resourceName: "Sony FX3 Cinema Camera Kit",
      userEmail: "dilani@primewave.com",
      startTime: setMinutes(setHours(today, 13), 0),  // 01:00 PM
      endTime: setMinutes(setHours(today, 17), 0),  // 05:00 PM
      status: ReservationStatus.CONFIRMED,
    },
    // Tomorrow: Prius
    {
      title: "Client Site Visit - Colombo 03",
      notes: "Onsite technical deployment check at client premises.",
      resourceName: "Toyota Prius (Company Hybrid - WP CAB-4512)",
      userEmail: "sarah@primewave.com",
      startTime: setMinutes(setHours(tomorrow, 9), 30), // Tomorrow 09:30 AM
      endTime: setMinutes(setHours(tomorrow, 13), 30), // Tomorrow 01:30 PM
      status: ReservationStatus.CONFIRMED,
    },
  ];

  // Clean old reservations before inserting to avoid duplicate conflicts on re-seeding
  await prisma.reservation.deleteMany({});

  for (const res of sampleReservations) {
    const resourceId = createdResources[res.resourceName];
    const userId = createdUsers[res.userEmail];

    if (resourceId && userId) {
      await prisma.reservation.create({
        data: {
          title: res.title,
          notes: res.notes,
          resourceId,
          userId,
          startTime: res.startTime,
          endTime: res.endTime,
          status: res.status,
        },
      });
    }
  }
  console.log(`✅ Seeded ${sampleReservations.length} realistic reservations.`);
  console.log("🚀 PrimeWave database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
