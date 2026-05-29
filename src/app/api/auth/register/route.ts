import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hash } from 'bcryptjs';
import { RegisterSchema } from '@/lib/auth/validators';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { email, password, firstName, lastName, tenantName } = parsed.data;

    // Check if user already exists across the platform
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    // Create tenant and user in a transaction
    const slug = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Check if tenant slug exists
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      return NextResponse.json({ error: 'Tenant name already taken' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug,
        },
      });

      // Bootstrap Wildcard permission if it doesn't exist
      let globalPerm = await tx.permission.findFirst({
        where: { resource: '*', action: '*' }
      });
      if (!globalPerm) {
        globalPerm = await tx.permission.create({
          data: {
            resource: '*',
            action: '*',
            description: 'Global Wildcard Access'
          }
        });
      }

      // 2. Create Admin Role
      const adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Admin',
          description: 'Global Administrator',
          isSystem: true,
          permissions: {
            create: {
              permissionId: globalPerm.id
            }
          }
        },
      });

      // 3. Create User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName,
          lastName,
          status: 'ACTIVE',
        },
      });

      // 4. Assign Role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
