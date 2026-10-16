
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const members = await prisma.organizationMember.findMany({
            where: { isArchived: false }
        });

        const orgAdmins = {};
        members.forEach(m => {
            if (!orgAdmins[m.organizationId]) orgAdmins[m.organizationId] = 0;
            if (m.role === 'ADMIN') orgAdmins[m.organizationId]++;
        });

        for (const [orgId, count] of Object.entries(orgAdmins)) {
            if (count === 0) {
                console.log(`Org ${orgId} has 0 admins.`);
                const firstMember = members.find(m => m.organizationId === orgId);
                if (firstMember) {
                    console.log(`Promoting ${firstMember.email} to ADMIN.`);
                    await prisma.organizationMember.update({
                        where: { id: firstMember.id },
                        data: { role: 'ADMIN' }
                    });
                }
            }
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
