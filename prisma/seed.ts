import { PrismaClient, OrganizationRole, ExpenseStatus, DonationCategory, ExpenseCategory, BhogStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding UTSAV database...");

    // 1. Create a Dev User
    const devUser = await prisma.user.upsert({
        where: { email: "dev@example.com" },
        update: {},
        create: {
            email: "dev@example.com",
            name: "Dev Admin",
        },
    });

    // 2. Create Organization
    const organization = await prisma.organization.upsert({
        where: { slug: "ganeshotsav-2026" },
        update: {},
        create: {
            name: "Ganeshotsav 2026",
            slug: "ganeshotsav-2026",
            description: "Grand annual Ganeshotsav celebration for the community.",
            type: "FESTIVAL",
            openingBalance: 500000,
            publicFundraisingTarget: 750000,
            budgetTarget: 500000,
            startDate: new Date("2026-09-07"),
            endDate: new Date("2026-09-17"),
        },
    });

    // 3. Create OrganizationMember
    const devMember = await prisma.organizationMember.upsert({
        where: { email_organizationId: { email: "dev@example.com", organizationId: organization.id } },
        update: {},
        create: {
            userId: devUser.id,
            email: devUser.email,
            organizationId: organization.id,
            role: OrganizationRole.ADMIN,
        },
    });

    console.log(`✅ Organization & Member created: ${organization.name}`);

    // 4. Create Donations
    await prisma.donation.createMany({
        data: [
            {
                donorName: "Rahul Sharma",
                amount: 10000,
                category: DonationCategory.GENERAL,
                organizationId: organization.id,
                addedById: devMember.id,
                date: new Date(),
            },
            {
                donorName: "Pooja Patel",
                amount: 5000,
                category: DonationCategory.GENERAL,
                organizationId: organization.id,
                addedById: devMember.id,
                date: new Date(),
            },
        ],
    });

    console.log("✅ Sample donations added");

    // 5. Create Approved Expenses
    await prisma.expense.createMany({
        data: [
            {
                title: "Idol Decoration & Flowers",
                amount: 20000,
                category: ExpenseCategory.DECORATION,
                status: ExpenseStatus.APPROVED,
                organizationId: organization.id,
                addedById: devMember.id,
                approvedById: devMember.id,
                createdAt: new Date(),
            },
            {
                title: "Prasad Distribution",
                amount: 10000,
                category: ExpenseCategory.FOOD,
                status: ExpenseStatus.APPROVED,
                organizationId: organization.id,
                addedById: devMember.id,
                approvedById: devMember.id,
                createdAt: new Date(),
            },
        ],
    });

    console.log("✅ Sample expenses added");

    // 6. Create Bhog Item
    await prisma.bhogItem.create({
        data: {
            name: "Ladoo",
            quantity: "500 Pieces",
            sponsorName: "Mahesh Traders",
            offeringDate: new Date("2026-09-08"),
            offeringWindow: "MORNING",
            organizationId: organization.id,
            status: BhogStatus.PENDING,
        },
    });

    console.log("✅ Sample bhog item added");

    // 7. Create Event
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(9, 0, 0, 0);

    await prisma.event.create({
        data: {
            title: "Morning Aarti Ceremony",
            description: "Daily morning aarti with traditional hymns.",
            startTime: tomorrow,
            endTime: tomorrowEnd,
            location: "Main Pandal, Community Center",
            organizationId: organization.id,
        },
    });

    console.log("✅ Sample event added");
    console.log("✨ Seeding complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
