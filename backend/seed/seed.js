import { connect, disconnect } from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { UserModel } from "../models/user.model.js";
import { PropertyModel } from "../models/property.model.js";
import { BuildingModel } from "../models/building.model.js";
import { UnitModel } from "../models/unit.model.js";
import { VendorModel } from "../models/vendor.model.js";
import { WorkOrderModel } from "../models/work-order.model.js";
import { AssignmentModel } from "../models/assignment.model.js";
import { EstimateModel } from "../models/estimate.model.js";
import { VisitModel } from "../models/visit.model.js";
import { DocumentModel } from "../models/document.model.js";
import { ChunkModel } from "../models/chunk.model.js";
import { WorkOrderEmbeddingModel } from "../models/work-order-embedding.model.js";
import { NotificationModel } from "../models/notification.model.js";
import { AuditEventModel } from "../models/audit-event.model.js";
import { SessionModel } from "../models/session.model.js";
import { InvitationModel } from "../models/invitation.model.js";
import { ConversationModel } from "../models/conversation.model.js";
import { AgentRunModel } from "../models/agent-run.model.js";
import { generateDocumentChunkEmbeddings } from "../services/generate-embeddings.service.js";
import { splitDocumentToChunks } from "../services/split-document.service.js";
import { indexWorkOrderEmbedding } from "../services/related-case-search.service.js";

config();

const DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/apartment_maintenance";

export async function seedDatabase() {
  console.log(`[Seed] Connecting to database at ${DB_URL}...`);
  await connect(DB_URL);

  console.log("[Seed] Purging existing database collections...");
  await Promise.all([
    UserModel.deleteMany({}),
    PropertyModel.deleteMany({}),
    BuildingModel.deleteMany({}),
    UnitModel.deleteMany({}),
    VendorModel.deleteMany({}),
    WorkOrderModel.deleteMany({}),
    AssignmentModel.deleteMany({}),
    EstimateModel.deleteMany({}),
    VisitModel.deleteMany({}),
    DocumentModel.deleteMany({}),
    ChunkModel.deleteMany({}),
    WorkOrderEmbeddingModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    AuditEventModel.deleteMany({}),
    SessionModel.deleteMany({}),
    InvitationModel.deleteMany({}),
    ConversationModel.deleteMany({}),
    AgentRunModel.deleteMany({}),
  ]);

  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  console.log("[Seed] Creating properties...");
  const propertyA = await PropertyModel.create({
    name: "Sunset Heights Luxury Apartments",
    code: "SHLA",
    address: {
      street: "100 Sunset Blvd",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    timezone: "America/Chicago",
    officeHours: "Monday - Friday: 8:30 AM - 5:30 PM CST",
    emergencyContacts: [
      {
        title: "24/7 Emergency Maintenance Dispatch",
        phone: "(512) 555-0199",
        description: "Call immediately for active flooding, gas odors, or loss of heating/cooling in extreme weather.",
        availableHours: "24/7",
      },
      {
        title: "Property Management Leasing Office",
        phone: "(512) 555-0100",
        description: "General questions and key pickup.",
        availableHours: "8:30 AM - 5:30 PM CST",
      },
    ],
    spendingRules: {
      managerApprovalLimit: 1200,
      requireResidentApprovalAbove: 300,
      autoApprovalLimit: 0,
    },
    notices: [
      {
        title: "Annual Plumbing Mainline Inspection",
        content: "Maintenance crews will inspect plumbing vertical risers next Tuesday between 9:00 AM and 1:00 PM.",
        category: "Maintenance",
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isPublic: true,
      },
      {
        title: "Community Rooftop Terrace Hours Extended",
        content: "Rooftop lounge hours are now extended until 10:00 PM on weekends.",
        category: "Amenities",
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        isPublic: true,
      },
    ],
    status: "active",
  });

  const propertyB = await PropertyModel.create({
    name: "Oakridge Terrace Residences",
    code: "OTR",
    address: {
      street: "450 Oakridge Ave",
      city: "Denver",
      state: "CO",
      zip: "80202",
    },
    timezone: "America/Denver",
    officeHours: "Monday - Friday: 9:00 AM - 5:00 PM MST",
    emergencyContacts: [
      {
        title: "Oakridge Emergency Maintenance Line",
        phone: "(303) 555-0811",
        description: "Emergency support for structural or major utility failure.",
        availableHours: "24/7",
      },
    ],
    spendingRules: {
      managerApprovalLimit: 1000,
      requireResidentApprovalAbove: 250,
      autoApprovalLimit: 0,
    },
    status: "active",
  });

  console.log("[Seed] Creating buildings and units...");
  const buildingA1 = await BuildingModel.create({
    propertyId: propertyA._id,
    name: "Building 1 - West Tower",
    code: "B1",
    address: "100 Sunset Blvd, Bldg 1",
    totalFloors: 4,
  });

  const buildingA2 = await BuildingModel.create({
    propertyId: propertyA._id,
    name: "Building 2 - East Wing",
    code: "B2",
    address: "100 Sunset Blvd, Bldg 2",
    totalFloors: 3,
  });

  const unit101 = await UnitModel.create({
    propertyId: propertyA._id,
    buildingId: buildingA1._id,
    unitNumber: "101",
    floor: 1,
    accessInstructions: "Electronic smart lock code 4821 or ring front intercom.",
    status: "occupied",
  });

  const unit201 = await UnitModel.create({
    propertyId: propertyA._id,
    buildingId: buildingA1._id,
    unitNumber: "201",
    floor: 2,
    accessInstructions: "Keypad code 9034. Dog locked in second bedroom during visits.",
    status: "occupied",
  });

  const unit305 = await UnitModel.create({
    propertyId: propertyA._id,
    buildingId: buildingA2._id,
    unitNumber: "305",
    floor: 3,
    accessInstructions: "Permission to enter granted between 10am-4pm.",
    status: "occupied",
  });

  console.log("[Seed] Creating vendors...");
  const plumbingVendor = await VendorModel.create({
    name: "Apex Plumbing & Drain Solutions",
    contactEmail: "dispatch@apexplumbing.com",
    phone: "(512) 555-7788",
    serviceCategories: ["plumbing", "fixtures"],
    skills: ["pipe leak repair", "copper soldering", "drain clearing", "toilet repair", "water heater"],
    approvedProperties: [propertyA._id, propertyB._id],
    hourlyRate: 95,
    rating: 4.9,
    status: "approved",
  });

  const hvacVendor = await VendorModel.create({
    name: "ClimateAir Heating & Cooling",
    contactEmail: "service@climateair.com",
    phone: "(512) 555-3344",
    serviceCategories: ["hvac"],
    skills: ["thermostat calibration", "compressor repair", "ductwork", "filter replacement", "freon recharge"],
    approvedProperties: [propertyA._id],
    hourlyRate: 110,
    rating: 4.8,
    status: "approved",
  });

  const electricalVendor = await VendorModel.create({
    name: "VoltMaster Electric Pros",
    contactEmail: "support@voltmaster.com",
    phone: "(512) 555-6611",
    serviceCategories: ["electrical", "appliances"],
    skills: ["breaker panel inspection", "outlet wiring", "lighting fixtures", "smoke detector repair"],
    approvedProperties: [propertyA._id, propertyB._id],
    hourlyRate: 105,
    rating: 4.7,
    status: "approved",
  });

  console.log("[Seed] Creating users across all three roles...");
  // Property Managers
  const managerA = await UserModel.create({
    email: "manager.sunset@apartments.com",
    passwordHash: defaultPasswordHash,
    name: "Sarah Jenkins (Sunset Manager)",
    phone: "(512) 555-0101",
    role: "property_manager",
    emailVerified: true,
    accountStatus: "active",
    propertyScope: [propertyA._id],
  });

  const managerB = await UserModel.create({
    email: "manager.oakridge@apartments.com",
    passwordHash: defaultPasswordHash,
    name: "David Miller (Oakridge Manager)",
    phone: "(303) 555-0812",
    role: "property_manager",
    emailVerified: true,
    accountStatus: "active",
    propertyScope: [propertyB._id],
  });

  // Residents
  const residentA = await UserModel.create({
    email: "resident.alice@sunset.com",
    passwordHash: defaultPasswordHash,
    name: "Alice Walker (Unit 201)",
    phone: "(512) 555-0201",
    role: "resident",
    emailVerified: true,
    accountStatus: "active",
    residentPropertyId: propertyA._id,
    residentUnitId: unit201._id,
  });
  unit201.residentIds.push(residentA._id);
  await unit201.save();

  const residentB = await UserModel.create({
    email: "resident.bob@sunset.com",
    passwordHash: defaultPasswordHash,
    name: "Bob Martinez (Unit 101)",
    phone: "(512) 555-0102",
    role: "resident",
    emailVerified: true,
    accountStatus: "active",
    residentPropertyId: propertyA._id,
    residentUnitId: unit101._id,
  });
  unit101.residentIds.push(residentB._id);
  await unit101.save();

  const residentC = await UserModel.create({
    email: "resident.clara@sunset.com",
    passwordHash: defaultPasswordHash,
    name: "Clara Oswald (Unit 305)",
    phone: "(512) 555-0305",
    role: "resident",
    emailVerified: true,
    accountStatus: "active",
    residentPropertyId: propertyA._id,
    residentUnitId: unit305._id,
  });
  unit305.residentIds.push(residentC._id);
  await unit305.save();

  // Vendor Technicians
  const plumberTech = await UserModel.create({
    email: "tech.mario@apexplumbing.com",
    passwordHash: defaultPasswordHash,
    name: "Mario Rossi (Master Plumber)",
    phone: "(512) 555-7799",
    role: "vendor_technician",
    emailVerified: true,
    accountStatus: "active",
    vendorId: plumbingVendor._id,
    skills: ["plumbing", "fixtures", "pipe leak repair", "water heater"],
  });

  const hvacTech = await UserModel.create({
    email: "tech.john@climateair.com",
    passwordHash: defaultPasswordHash,
    name: "John Frost (HVAC Specialist)",
    phone: "(512) 555-3355",
    role: "vendor_technician",
    emailVerified: true,
    accountStatus: "active",
    vendorId: hvacVendor._id,
    skills: ["hvac", "thermostat calibration", "ductwork"],
  });

  const electricianTech = await UserModel.create({
    email: "tech.elena@voltmaster.com",
    passwordHash: defaultPasswordHash,
    name: "Elena Sparks (Electrician)",
    phone: "(512) 555-6622",
    role: "vendor_technician",
    emailVerified: true,
    accountStatus: "active",
    vendorId: electricalVendor._id,
    skills: ["electrical", "appliances", "breaker panel inspection"],
  });

  console.log("[Seed] Creating demonstration maintenance work orders...");
  // Case 1: Resident A (Unit 201) kitchen pipe leak
  const workOrder1 = await WorkOrderModel.create({
    reference: "WO-2026-1042",
    propertyId: propertyA._id,
    buildingId: buildingA1._id,
    unitId: unit201._id,
    residentId: residentA._id,
    category: "plumbing",
    title: "Water leaking near kitchen sink and subfloor",
    description: "There is persistent water pooling underneath my kitchen sink cabinet that is seeping into the baseboard and subfloor. Water drips when the faucet is running.",
    priority: "high",
    status: "Under Review",
    accessPreferences: "Available weekday mornings. Ring intercom or enter with master key.",
    preferredAccessWindows: [
      {
        start: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow 9:00 AM
        end: new Date(Date.now() + 27 * 60 * 60 * 1000),   // Tomorrow 12:00 PM
        note: "Morning visit preferred.",
      },
    ],
    timeline: [
      {
        status: "Submitted",
        changedBy: residentA._id,
        role: "resident",
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        notes: "Work order submitted by resident.",
      },
      {
        status: "Under Review",
        changedBy: managerA._id,
        role: "property_manager",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        notes: "Manager marked request under review.",
      },
    ],
  });
  await indexWorkOrderEmbedding(workOrder1);

  // Case 2: Resident B (Unit 101, directly below Unit 201) ceiling dampness & dripping (RELATED CASE!)
  const workOrder2 = await WorkOrderModel.create({
    reference: "WO-2026-1048",
    propertyId: propertyA._id,
    buildingId: buildingA1._id,
    unitId: unit101._id,
    residentId: residentB._id,
    category: "plumbing",
    title: "Damp stain and slow dripping from kitchen ceiling",
    description: "I noticed a circular yellow water stain on my kitchen ceiling right near the main vertical pipe riser. It has started slowly dripping onto the counter.",
    priority: "high",
    status: "Submitted",
    accessPreferences: "Permission to enter granted anytime.",
    preferredAccessWindows: [
      {
        start: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow 9:00 AM
        end: new Date(Date.now() + 28 * 60 * 60 * 1000),   // Tomorrow 1:00 PM
        note: "Please inspect pipe chase above.",
      },
    ],
    timeline: [
      {
        status: "Submitted",
        changedBy: residentB._id,
        role: "resident",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        notes: "Work order submitted by resident.",
      },
    ],
  });
  await indexWorkOrderEmbedding(workOrder2);

  // Case 3: Resident C (Unit 305) HVAC airflow problem
  const workOrder3 = await WorkOrderModel.create({
    reference: "WO-2026-1055",
    propertyId: propertyA._id,
    buildingId: buildingA2._id,
    unitId: unit305._id,
    residentId: residentC._id,
    category: "hvac",
    title: "AC blowing lukewarm air in living room",
    description: "The air conditioner is running constantly but cannot cool the apartment below 78 degrees. Air coming from vents feels lukewarm.",
    priority: "normal",
    status: "Awaiting Approval",
    preferredAccessWindows: [
      {
        start: new Date(Date.now() + 48 * 60 * 60 * 1000),
        end: new Date(Date.now() + 52 * 60 * 60 * 1000),
        note: "Afternoon window.",
      },
    ],
    timeline: [
      {
        status: "Submitted",
        changedBy: residentC._id,
        role: "resident",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        notes: "Submitted.",
      },
      {
        status: "Assigned",
        changedBy: managerA._id,
        role: "property_manager",
        timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000),
        notes: "Assigned to ClimateAir Heating & Cooling.",
      },
      {
        status: "Awaiting Approval",
        changedBy: hvacTech._id,
        role: "vendor_technician",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        notes: "Estimate submitted for condenser capacitor and refrigerant recharge.",
      },
    ],
  });
  await indexWorkOrderEmbedding(workOrder3);

  console.log("[Seed] Creating assignments and estimate with itemized breakdown...");
  const hvacAssignment = await AssignmentModel.create({
    workOrderId: workOrder3._id,
    propertyId: propertyA._id,
    vendorId: hvacVendor._id,
    technicianId: hvacTech._id,
    status: "assigned",
    assignedBy: managerA._id,
    progressRecords: [
      {
        status: "assigned",
        notes: "Initial diagnostic completed.",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        recordedBy: hvacTech._id,
      },
    ],
  });
  workOrder3.currentAssignmentId = hvacAssignment._id;

  const hvacEstimate = await EstimateModel.create({
    workOrderId: workOrder3._id,
    assignmentId: hvacAssignment._id,
    vendorId: hvacVendor._id,
    technicianId: hvacTech._id,
    revision: 1,
    lineItems: [
      {
        description: "Dual Run Capacitor 45/5 MFD replacement",
        quantity: 1,
        unitPrice: 65,
        amount: 65,
      },
      {
        description: "R-410A Refrigerant Leak Test & 2 lb Recharge",
        quantity: 2,
        unitPrice: 90,
        amount: 180,
      },
    ],
    laborCost: 150,
    materialCost: 245,
    taxAmount: 32.59,
    subtotal: 395,
    totalAmount: 427.59,
    currency: "USD",
    exclusions: "Compressor coil replacement if internal motor winding is burnt.",
    assumptions: "Thermostat wiring and electrical disconnect are operational.",
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    decisionStatus: "pending",
  });
  workOrder3.currentEstimateId = hvacEstimate._id;
  await workOrder3.save();

  console.log("[Seed] Ingesting policy and equipment documents with vector embeddings...");
  // Document 1: Apartment Maintenance Policy & Responsibility Guide
  const policyContent = `SUNSET HEIGHTS RESIDENTIAL COMMUNITY MAINTENANCE POLICY & REPAIR GUIDELINES (Version 2.1)

Section 1: General Responsibility Division
Management Responsibility: The property management company is exclusively responsible for all building structural components, exterior roofs, common hallways, standard building plumbing mains, vertical water risers, central water heaters, HVAC compressors, built-in kitchen ranges, and community electrical panels. Residents MUST NOT attempt DIY repairs on any of these systems.

Resident Responsibility: Residents are responsible for routine interior upkeep, including replacing standard incandescent or LED light bulbs inside their unit, plunging simple minor toilet clogs with a standard plunger, cleaning grease filters in the range hood, and maintaining smoke detector batteries when prompted by low-battery beeps.

Section 2: Plumbing Leaks and Pipe Infiltration
Any plumbing leak originating inside vertical walls or ceiling chases is 100% Management responsibility. Residents reporting ceiling stains or active pipe drips must immediately submit an urgent maintenance report. Shut off the under-sink angle stop valve if localized to a sink fixture. Under no circumstances may a resident puncture or drill through wet drywall.

Section 3: HVAC Operation and Temperature Standards
During summer months, HVAC units must not be set below 68 degrees Fahrenheit to prevent evaporator coil freezing. In extreme freeze conditions (below 32 degrees Fahrenheit), residents must leave cabinet doors open beneath exterior-wall sinks and keep thermostats set to at least 65 degrees to protect pipes.

Section 4: Life-Safety and Hazardous Emergencies
If a gas odor, active major flooding, or sparking electrical fixture is detected, evacuate immediately and call the 24/7 Emergency Dispatch at (512) 555-0199 or emergency services (911). Never wait for routine maintenance scheduling.`;

  const doc1 = await DocumentModel.create({
    title: "Sunset Heights Maintenance Responsibility & Policy Guide",
    documentType: "policy",
    propertyId: propertyA._id,
    sourceFilename: "sunset_heights_maintenance_policy_v2.1.txt",
    storagePath: "./uploads/sunset_heights_maintenance_policy_v2.1.txt",
    fileSize: policyContent.length,
    mimeType: "text/plain",
    version: "2.1",
    visibilityScope: "residents",
    uploadedBy: managerA._id,
    processingStatus: "Ready",
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:4b",
  });

  const chunks1 = await splitDocumentToChunks(policyContent, 600, 100);
  const embeddedChunks1 = await generateDocumentChunkEmbeddings(
    doc1._id,
    doc1.version,
    doc1.propertyId,
    doc1.visibilityScope,
    chunks1,
  );
  await ChunkModel.insertMany(embeddedChunks1);
  doc1.extractionMetadata = {
    pageCount: 1,
    textLength: policyContent.length,
    chunkCount: embeddedChunks1.length,
    error: "",
  };
  await doc1.save();

  // Document 2: Balcony Decoration Guidelines (Intentionally lacks gas/stove information to demonstrate insufficient evidence handling)
  const balconyContent = `SUNSET HEIGHTS BALCONY & PATIO DECORATION REGULATIONS (Version 1.0)

Section 1: Permitted Balcony Furniture
Residents may place standard weather-resistant patio chairs, small bistro tables, and potted plants on private balconies. Planter boxes must be mounted securely on the interior side of railings.

Section 2: Prohibited Items
Charcoal grills, open-flame fire pits, and hanging laundry lines are strictly prohibited on all balconies pursuant to local fire code. Electric grills are permitted provided they are UL-listed.`;

  const doc2 = await DocumentModel.create({
    title: "Balcony & Patio Decoration Regulations",
    documentType: "policy",
    propertyId: propertyA._id,
    sourceFilename: "balcony_regulations_v1.0.txt",
    storagePath: "./uploads/balcony_regulations_v1.0.txt",
    fileSize: balconyContent.length,
    mimeType: "text/plain",
    version: "1.0",
    visibilityScope: "residents",
    uploadedBy: managerA._id,
    processingStatus: "Ready",
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:4b",
  });

  const chunks2 = await splitDocumentToChunks(balconyContent, 500, 80);
  const embeddedChunks2 = await generateDocumentChunkEmbeddings(
    doc2._id,
    doc2.version,
    doc2.propertyId,
    doc2.visibilityScope,
    chunks2,
  );
  await ChunkModel.insertMany(embeddedChunks2);
  doc2.extractionMetadata = {
    pageCount: 1,
    textLength: balconyContent.length,
    chunkCount: embeddedChunks2.length,
    error: "",
  };
  await doc2.save();

  console.log("\n=========================================================");
  console.log("       APARTMENT MAINTENANCE OPERATIONS - SEEDED!        ");
  console.log("=========================================================");
  console.log("DEMO ACCOUNTS (Password for all: Password123!)");
  console.log("---------------------------------------------------------");
  console.log("1. PROPERTY MANAGER (Sunset Heights):");
  console.log("   Email: manager.sunset@apartments.com");
  console.log("   Role:  property_manager");
  console.log("2. PROPERTY MANAGER (Oakridge Terrace):");
  console.log("   Email: manager.oakridge@apartments.com");
  console.log("   Role:  property_manager");
  console.log("3. RESIDENT A (Sunset Heights Unit 201):");
  console.log("   Email: resident.alice@sunset.com");
  console.log("   Role:  resident");
  console.log("4. RESIDENT B (Sunset Heights Unit 101 - Related Report):");
  console.log("   Email: resident.bob@sunset.com");
  console.log("   Role:  resident");
  console.log("5. VENDOR TECHNICIAN (Apex Plumbing):");
  console.log("   Email: tech.mario@apexplumbing.com");
  console.log("   Role:  vendor_technician");
  console.log("6. VENDOR TECHNICIAN (ClimateAir HVAC):");
  console.log("   Email: tech.john@climateair.com");
  console.log("   Role:  vendor_technician");
  console.log("=========================================================\n");

  await disconnect();
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Seed Failed]", err);
      process.exit(1);
    });
}
