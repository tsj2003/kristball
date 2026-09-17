import { PrismaClient, Role, EquipmentCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.apiAccessLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.expenditure.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.personnel.deleteMany();
  await prisma.user.deleteMany();
  await prisma.equipmentType.deleteMany();
  await prisma.base.deleteMany();

  const fortAlpha = await prisma.base.create({
    data: { name: "Fort Alpha", code: "FTA", location: "Fort Irwin, California" },
  });
  const fortBravo = await prisma.base.create({
    data: { name: "Fort Bravo", code: "FTB", location: "Fort Liberty, North Carolina" },
  });
  const stationCharlie = await prisma.base.create({
    data: { name: "Station Charlie", code: "STC", location: "Norfolk, Virginia" },
  });

  const humvee = await prisma.equipmentType.create({
    data: {
      name: "M1151 Humvee",
      category: EquipmentCategory.VEHICLE,
      unit: "vehicle",
      description: "Up-armored utility vehicle",
    },
  });
  const truck = await prisma.equipmentType.create({
    data: {
      name: "FMTV Cargo Truck",
      category: EquipmentCategory.VEHICLE,
      unit: "vehicle",
      description: "Medium tactical cargo truck",
    },
  });
  const m4 = await prisma.equipmentType.create({
    data: {
      name: "M4A1 Carbine",
      category: EquipmentCategory.WEAPON,
      unit: "weapon",
      description: "5.56mm carbine",
    },
  });
  const ak47 = await prisma.equipmentType.create({
    data: {
      name: "AK-47 Rifle",
      category: EquipmentCategory.WEAPON,
      unit: "weapon",
      description: "Captured/foreign 7.62mm rifle held for training",
    },
  });
  const nato556 = await prisma.equipmentType.create({
    data: {
      name: "5.56×45mm NATO",
      category: EquipmentCategory.AMMUNITION,
      unit: "rounds",
      description: "Ball ammunition, linked and boxed",
    },
  });
  const parabellum = await prisma.equipmentType.create({
    data: {
      name: "9×19mm Parabellum",
      category: EquipmentCategory.AMMUNITION,
      unit: "rounds",
      description: "Pistol ammunition",
    },
  });

  const password = async (plain: string) => bcrypt.hash(plain, 10);

  const admin = await prisma.user.create({
    data: {
      username: "admin_user",
      passwordHash: await password("AdminPass123!"),
      fullName: "Col. Hannah Reeves",
      role: Role.ADMIN,
    },
  });
  const commander = await prisma.user.create({
    data: {
      username: "commander_alpha",
      passwordHash: await password("CommandPass123!"),
      fullName: "LTC David Okoye",
      role: Role.BASE_COMMANDER,
      baseId: fortAlpha.id,
    },
  });
  const logistics = await prisma.user.create({
    data: {
      username: "logistics_officer",
      passwordHash: await password("LogisticsPass123!"),
      fullName: "MAJ Sofia Alvarez",
      role: Role.LOGISTICS_OFFICER,
      baseId: fortAlpha.id,
    },
  });

  const hale = await prisma.personnel.create({
    data: {
      baseId: fortAlpha.id,
      fullName: "Marcus Hale",
      rank: "SFC",
      serviceNumber: "FTA-10482",
    },
  });
  const vasquez = await prisma.personnel.create({
    data: {
      baseId: fortAlpha.id,
      fullName: "Elena Vasquez",
      rank: "CPL",
      serviceNumber: "FTA-22119",
    },
  });
  const okonkwo = await prisma.personnel.create({
    data: {
      baseId: fortAlpha.id,
      fullName: "James Okonkwo",
      rank: "PFC",
      serviceNumber: "FTA-33801",
    },
  });
  const nair = await prisma.personnel.create({
    data: {
      baseId: fortAlpha.id,
      fullName: "Priya Nair",
      rank: "SSG",
      serviceNumber: "FTA-19044",
    },
  });
  const cho = await prisma.personnel.create({
    data: {
      baseId: fortBravo.id,
      fullName: "Daniel Cho",
      rank: "SGT",
      serviceNumber: "FTB-55102",
    },
  });
  const farouk = await prisma.personnel.create({
    data: {
      baseId: fortBravo.id,
      fullName: "Amina Farouk",
      rank: "CPL",
      serviceNumber: "FTB-66230",
    },
  });

  const buy = (
    baseId: string,
    equipmentTypeId: string,
    quantity: number,
    unitCost: number,
    purchasedAt: string,
    notes: string
  ) =>
    prisma.purchase.create({
      data: {
        baseId,
        equipmentTypeId,
        quantity,
        unitCost,
        purchasedAt: new Date(purchasedAt),
        purchasedById: logistics.id,
        notes,
      },
    });

  await buy(fortAlpha.id, humvee.id, 4, 220000, "2026-01-12T10:00:00Z", "FY26 tactical vehicle allotment");
  await buy(fortAlpha.id, truck.id, 2, 185000, "2026-01-12T10:15:00Z", "Cargo lift for Alpha motor pool");
  await buy(fortAlpha.id, m4.id, 24, 1250, "2026-01-14T09:00:00Z", "Replacement carbines, Alpha arms room");
  await buy(fortAlpha.id, ak47.id, 6, 780, "2026-01-14T09:20:00Z", "Opposing-force training rifles");
  await buy(fortAlpha.id, nato556.id, 80000, 0.42, "2026-01-16T08:00:00Z", "Lot A26-556, boxed ball");
  await buy(fortAlpha.id, parabellum.id, 15000, 0.31, "2026-01-16T08:30:00Z", "Pistol range stock");

  await buy(fortBravo.id, humvee.id, 2, 220000, "2026-01-22T11:00:00Z", "Bravo motor pool fill");
  await buy(fortBravo.id, m4.id, 10, 1250, "2026-01-22T11:20:00Z", "Bravo arms room");
  await buy(fortBravo.id, nato556.id, 20000, 0.42, "2026-01-24T07:45:00Z", "Lot B26-556");

  await buy(stationCharlie.id, truck.id, 1, 185000, "2026-02-03T13:00:00Z", "Port-side cargo truck");
  await buy(stationCharlie.id, m4.id, 8, 1250, "2026-02-03T13:20:00Z", "Charlie small-arms issue");
  await buy(stationCharlie.id, nato556.id, 10000, 0.42, "2026-02-04T09:00:00Z", "Lot C26-556");

  await prisma.transfer.create({
    data: {
      fromBaseId: fortAlpha.id,
      toBaseId: fortBravo.id,
      equipmentTypeId: humvee.id,
      quantity: 1,
      transferredAt: new Date("2026-03-05T15:00:00Z"),
      initiatedById: logistics.id,
      notes: "Cross-level one Humvee to Bravo for convoy escort",
    },
  });
  await prisma.transfer.create({
    data: {
      fromBaseId: fortAlpha.id,
      toBaseId: fortBravo.id,
      equipmentTypeId: nato556.id,
      quantity: 8000,
      transferredAt: new Date("2026-03-05T15:10:00Z"),
      initiatedById: logistics.id,
      notes: "Ammunition accompaniment for transferred vehicle crew",
    },
  });
  await prisma.transfer.create({
    data: {
      fromBaseId: fortAlpha.id,
      toBaseId: stationCharlie.id,
      equipmentTypeId: m4.id,
      quantity: 2,
      transferredAt: new Date("2026-03-12T16:00:00Z"),
      initiatedById: logistics.id,
      notes: "Temporary issue to Charlie boarding team",
    },
  });

  const haleVehicle = await prisma.assignment.create({
    data: {
      baseId: fortAlpha.id,
      personnelId: hale.id,
      equipmentTypeId: humvee.id,
      quantity: 1,
      assignedAt: new Date("2026-04-02T08:00:00Z"),
      assignedById: commander.id,
      notes: "Squad leader vehicle, Alpha motor pool",
    },
  });
  const vasquezRifle = await prisma.assignment.create({
    data: {
      baseId: fortAlpha.id,
      personnelId: vasquez.id,
      equipmentTypeId: ak47.id,
      quantity: 1,
      assignedAt: new Date("2026-04-02T08:10:00Z"),
      assignedById: commander.id,
      notes: "OPFOR trainer rifle",
    },
  });
  const okonkwoAmmo = await prisma.assignment.create({
    data: {
      baseId: fortAlpha.id,
      personnelId: okonkwo.id,
      equipmentTypeId: nato556.id,
      quantity: 10000,
      assignedAt: new Date("2026-04-03T07:30:00Z"),
      assignedById: commander.id,
      notes: "Annual qualification draw",
    },
  });
  await prisma.assignment.create({
    data: {
      baseId: fortAlpha.id,
      personnelId: nair.id,
      equipmentTypeId: m4.id,
      quantity: 2,
      assignedAt: new Date("2026-04-03T07:45:00Z"),
      assignedById: commander.id,
      notes: "Section weapons, including spare",
    },
  });
  await prisma.assignment.create({
    data: {
      baseId: fortBravo.id,
      personnelId: cho.id,
      equipmentTypeId: humvee.id,
      quantity: 1,
      assignedAt: new Date("2026-04-08T09:00:00Z"),
      assignedById: admin.id,
      notes: "Escort vehicle drawn from Bravo pool",
    },
  });
  await prisma.assignment.create({
    data: {
      baseId: fortBravo.id,
      personnelId: farouk.id,
      equipmentTypeId: m4.id,
      quantity: 4,
      assignedAt: new Date("2026-04-08T09:15:00Z"),
      assignedById: admin.id,
      notes: "Fire team issue",
    },
  });

  await prisma.expenditure.create({
    data: {
      assignmentId: okonkwoAmmo.id,
      quantity: 5000,
      expendedAt: new Date("2026-05-18T14:00:00Z"),
      recordedById: commander.id,
      notes: "Live-fire qualification — 5,000 of 10,000 rounds expended",
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: logistics.id,
        action: "PURCHASE_CREATED",
        entityType: "Purchase",
        entityId: "seed-batch-alpha",
        details: { note: "FY26 Alpha opening buys" },
      },
      {
        userId: logistics.id,
        action: "TRANSFER_COMPLETED",
        entityType: "Transfer",
        entityId: "seed-transfer-alpha-bravo",
        details: { note: "Humvee + 8,000 rounds Alpha to Bravo" },
      },
      {
        userId: commander.id,
        action: "ASSIGNMENT_CREATED",
        entityType: "Assignment",
        entityId: haleVehicle.id,
        details: { personnel: "SFC Marcus Hale", qty: 1 },
      },
      {
        userId: commander.id,
        action: "ASSIGNMENT_CREATED",
        entityType: "Assignment",
        entityId: vasquezRifle.id,
        details: { personnel: "CPL Elena Vasquez", qty: 1 },
      },
      {
        userId: commander.id,
        action: "EXPENDITURE_RECORDED",
        entityType: "Expenditure",
        entityId: okonkwoAmmo.id,
        details: { personnel: "PFC James Okonkwo", expended: 5000, remaining: 5000 },
      },
    ],
  });

  console.log("Seed complete.");
  console.log("  admin_user / AdminPass123!");
  console.log("  commander_alpha / CommandPass123!  (Fort Alpha)");
  console.log("  logistics_officer / LogisticsPass123!  (Fort Alpha)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
