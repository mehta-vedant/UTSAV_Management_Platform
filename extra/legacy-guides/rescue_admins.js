
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking for organizations with no active admins...");

    const organizations = await prisma.organization.findMany({
        include: {
            members: {
                where: { isArchived: false }
            }
        }
    });

    for (const org of organizations) {
        const admins = org.members.filter(m => m.role === 'ADMIN');
        if (admins.length === 0) {
            console.log(`[ALERT] Organization "${org.name}" (${org.id}) has NO ADMINS!`);
            console.log(`Members:`, org.members.map(m => ({ email: m.email, role: m.role })));

            // Auto-fix: Find the first non-archived member and promote to ADMIN
            if (org.members.length > 0) {
                const targetMember = org.members[0];
                console.log(`[FIX] Promoting ${targetMember.email} to ADMIN to restore access.`);
                await prisma.organizationMember.update({
                    where: { id: targetMember.id },
                    data: { role: 'ADMIN' }
                });
            }
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
